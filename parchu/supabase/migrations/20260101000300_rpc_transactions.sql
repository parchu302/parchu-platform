-- Transacciones de negocio como funciones plpgsql (reemplazan db.$transaction).
-- Atomicidad garantizada dentro de cada función. Se invocan vía rpc() con el
-- cliente service_role (bypassa RLS tras la autorización en la capa de app).

-- ============================================================
-- Reserva de stock + creación de pedido (antes createOrderWithStockReservation)
-- ============================================================
-- Descuento condicional (WHERE stock >= cantidad): dos compras simultáneas del
-- último artículo no pueden dejar stock negativo. Cero filas afectadas =
-- stock insuficiente -> excepción que revierte todo el pedido.
create or replace function public.create_order_with_stock_reservation(
  p_business_id uuid,
  p_guest_name text,
  p_guest_contact text,
  p_payment_method_id uuid,
  p_total numeric,
  p_confirmation_code_hash text,
  p_confirmation_code_encrypted text,
  p_tracking_token text,
  p_items jsonb
) returns public."Order"
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_affected int;
  v_order public."Order";
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    update public."Product"
       set "stock" = "stock" - (v_item ->> 'quantity')::int
     where "id" = (v_item ->> 'productId')::uuid
       and "stock" >= (v_item ->> 'quantity')::int;

    get diagnostics v_affected = row_count;
    if v_affected = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', (v_item ->> 'productId')
        using errcode = 'P0001';
    end if;
  end loop;

  insert into public."Order" (
    "businessId", "guestName", "guestContact", "paymentMethodId", "total",
    "confirmationCodeHash", "confirmationCodeEncrypted", "trackingToken"
  ) values (
    p_business_id, p_guest_name, p_guest_contact, p_payment_method_id, p_total,
    p_confirmation_code_hash, p_confirmation_code_encrypted, p_tracking_token
  ) returning * into v_order;

  insert into public."OrderItem" ("orderId", "productId", "quantity", "unitPrice", "subtotal")
  select v_order.id,
         (i ->> 'productId')::uuid,
         (i ->> 'quantity')::int,
         (i ->> 'unitPrice')::numeric,
         (i ->> 'subtotal')::numeric
    from jsonb_array_elements(p_items) i;

  return v_order;
end;
$$;

-- ============================================================
-- Cancelar liberando stock (antes cancelOrderReleasingStock)
-- ============================================================
create or replace function public.cancel_order_releasing_stock(
  p_order_id uuid,
  p_reason text,
  p_items jsonb
) returns public."Order"
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_order public."Order";
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    update public."Product"
       set "stock" = "stock" + (v_item ->> 'quantity')::int
     where "id" = (v_item ->> 'productId')::uuid;
  end loop;

  update public."Order"
     set "status" = 'CANCELADO', "cancelReason" = p_reason
   where "id" = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ============================================================
-- Completar acreditando ventas (antes completeOrderCountingSales)
-- ============================================================
create or replace function public.complete_order_counting_sales(
  p_order_id uuid,
  p_items jsonb
) returns public."Order"
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_order public."Order";
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    update public."Product"
       set "salesCount" = "salesCount" + (v_item ->> 'quantity')::int
     where "id" = (v_item ->> 'productId')::uuid;
  end loop;

  update public."Order"
     set "status" = 'COMPLETADO', "failedAttempts" = 0
   where "id" = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ============================================================
-- Rate limit: incremento atómico (antes raw INSERT ON CONFLICT)
-- ============================================================
create or replace function public.increment_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_cutoff timestamptz
) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public."RateLimitAttempt" ("key", "windowStart", "count")
  values (p_key, p_window_start, 1)
  on conflict ("key", "windowStart")
  do update set "count" = public."RateLimitAttempt"."count" + 1
  returning "count" into v_count;

  -- Limpieza oportunista de ventanas vencidas de esta misma clave.
  delete from public."RateLimitAttempt"
   where "key" = p_key and "windowStart" < p_cutoff;

  return v_count;
end;
$$;

-- ============================================================
-- Permisos: solo service_role (la app autoriza antes en requireRole)
-- ============================================================
revoke execute on function public.create_order_with_stock_reservation(uuid, text, text, uuid, numeric, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.cancel_order_releasing_stock(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.complete_order_counting_sales(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.increment_rate_limit(text, timestamptz, timestamptz) from public, anon, authenticated;

grant execute on function public.create_order_with_stock_reservation(uuid, text, text, uuid, numeric, text, text, text, jsonb) to service_role;
grant execute on function public.cancel_order_releasing_stock(uuid, text, jsonb) to service_role;
grant execute on function public.complete_order_counting_sales(uuid, jsonb) to service_role;
grant execute on function public.increment_rate_limit(text, timestamptz, timestamptz) to service_role;
