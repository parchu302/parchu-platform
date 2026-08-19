import { FeaturedBoard } from "@/components/landing/FeaturedBoard";

// El tablero destacado se lee de la base de datos: sin esto la pagina se
// prerenderiza en el build y congelaria esos productos para siempre.
// Es la vista de mayor trafico, asi que se sirve estatica y se regenera cada
// 5 minutos en vez de consultar en cada request.
export const revalidate = 300;

const WRAP = "mx-auto w-full max-w-[1100px] px-6";
const SECTION_LABEL =
  "mb-2.5 font-mono text-[13px] font-bold uppercase tracking-[.12em] text-teal";
const SECTION_TITLE = "mb-10 max-w-[640px] font-display text-[clamp(26px,4vw,38px)]";
const BTN =
  "inline-block rounded-[3px] border-2 border-ink px-[26px] py-[15px] text-[15.5px] font-bold no-underline transition-transform hover:-translate-y-0.5";

const WHATSAPP_LEAD_URL =
  "https://wa.me/573178727517?text=Hola%2C%20quiero%20vender%20en%20ParchU.%20Vendo%3A%20";

const STEPS = [
  {
    num: "01",
    title: "Te registras",
    text: "Cuéntanos qué vendes, tus precios y cómo te contactan. Sin costo por entrar.",
  },
  {
    num: "02",
    title: "Apareces en el tablero",
    text: "Tu producto queda visible para todos los estudiantes que buscan qué comprar en el campus.",
  },
  {
    num: "03",
    title: "Vendes y pagas una comisión",
    text: "Solo pagas un pequeño % cuando la venta se concreta gracias a ParchU. Si no vendes, no pagas.",
  },
];

export default function LandingPage() {
  return (
    <>
      <header className={WRAP + " pt-[22px]"}>
        <div className="flex items-center justify-between border-b-2 border-dashed border-line pb-[18px]">
          <div className="flex items-center gap-2.5 font-display text-[22px] tracking-[.5px]">
            <span className="h-3 w-3 rounded-full bg-coral shadow-[0_2px_3px_rgba(0,0,0,.25)]" />
            ParchU
          </div>
          <nav>
            {[
              { href: "#como", label: "Cómo funciona" },
              { href: "/productos", label: "El tablero" },
              { href: "/login", label: "Entrar" },
              { href: "/registro", label: "Sumarme" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="ml-[26px] border-b-2 border-transparent pb-1 text-sm font-semibold uppercase tracking-[.06em] no-underline hover:border-mustard"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section className={WRAP + " relative pb-[60px] pt-[70px]"}>
        <div className="absolute right-6 top-7 hidden h-[34px] w-[120px] rotate-[6deg] opacity-70 [background:repeating-linear-gradient(45deg,rgba(31,111,107,.35)_0_6px,rgba(31,111,107,.2)_6px_12px)] min-[820px]:block" />
        <span className="inline-block -rotate-2 bg-mustard px-3 py-1.5 font-mono text-[12.5px] font-bold tracking-[.03em] shadow-[2px_3px_0_rgba(43,33,24,.2)]">
          📌 hecho por y para tu universidad
        </span>
        <h1 className="my-[22px] max-w-[780px] font-display text-[clamp(38px,6vw,68px)] leading-[1.02]">
          Todo lo que se vende en <span className="text-coral">tu campus</span>,
          en un solo corcho.
        </h1>
        <p className="mb-[34px] max-w-[560px] text-[19px] text-ink/85">
          Comida, ropa, tecnología, servicios, diseño, tutorías express — ParchU
          reúne a todos los que venden algo en tu universidad para que te
          encuentren más fácil y vendas más.
        </p>
        <div className="flex flex-wrap gap-4 max-sm:flex-col max-sm:[&>a]:text-center">
          <a href="/registro" className={BTN + " bg-ink text-paper"}>
            Quiero vender aquí
          </a>
          <a href="/productos" className={BTN + " bg-transparent text-ink"}>
            Ver qué se está vendiendo
          </a>
          <a
            href={WHATSAPP_LEAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN + " bg-transparent text-ink"}
          >
            💬 Escríbenos por WhatsApp
          </a>
        </div>
      </section>

      <section id="como" className={WRAP + " py-16"}>
        <div className={SECTION_LABEL}>Cómo funciona</div>
        <h2 className={SECTION_TITLE}>Tres pasos y ya estás en el tablero.</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded border-2 border-ink bg-paper-2 p-6"
            >
              <div className="mb-2.5 font-display text-[38px] leading-none text-coral">
                {step.num}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-[14.5px] text-ink/80">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tablero" className={WRAP + " py-16"}>
        <div className={SECTION_LABEL}>El tablero</div>
        <h2 className={SECTION_TITLE}>
          Esto es lo que ya se está vendiendo en el campus.
        </h2>
        <FeaturedBoard />
      </section>

      <section className={WRAP + " py-16"}>
        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-[260px] flex-1">
            <div className={SECTION_LABEL}>Cómo ganamos todos</div>
            <h2 className={SECTION_TITLE + " !mb-3.5"}>
              Nadie paga por estar. Solo compartimos lo que se vende gracias al
              tablero.
            </h2>
            <p className="max-w-[480px] text-ink/80">
              Cero cuota de entrada, cero letra pequeña. ParchU solo gana cuando
              tú ganas.
            </p>
          </div>
          <div className="min-w-[220px] -rotate-1 rounded-lg bg-teal px-[34px] py-[30px] text-center text-white">
            <span className="block font-display text-[44px]">8%</span>
            <span className="font-mono text-[12.5px] tracking-[.05em]">
              SOLO SOBRE VENTAS CONCRETADAS
            </span>
          </div>
        </div>
      </section>

      <footer
        className={
          WRAP + " flex flex-wrap justify-between gap-2.5 border-t-2 border-dashed border-line py-[34px] text-[13px] text-ink/65"
        }
      >
        <span>
          ParchU — un tablero para todo lo que se vende en el campus.
        </span>
        <span>Modelo: 8% solo sobre ventas generadas por ParchU.</span>
      </footer>
    </>
  );
}
