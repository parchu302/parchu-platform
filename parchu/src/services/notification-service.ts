import { createNotification } from "@/repositories/notification-repository";

// Interfaz para desacoplar el efecto secundario: hoy escribe en tabla, manana
// podria enviar correo o push sin tocar a quien la invoca.
export interface NotificationService {
  notify(userId: string, message: string): Promise<void>;
}

// Notificaciones internas: sin correo ni SMS en esta version. El destinatario
// siempre es un usuario con cuenta (emprendedor o admin); el cliente invitado
// no tiene userId y consulta su pedido por el enlace de seguimiento.
export const notificationService: NotificationService = {
  async notify(userId, message) {
    await createNotification({ userId, message });
  },
};
