import type { Metadata } from "next";
import { Archivo_Black, JetBrains_Mono, Work_Sans } from "next/font/google";
import "./globals.css";

// Archivo Black no es fuente variable: el peso es obligatorio y solo existe 400.
const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo-black",
});

// Work Sans y JetBrains Mono si son variables: omitir weight descarga
// un unico archivo con todo el rango de pesos.
const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-work-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "ParchU — Todo lo que se vende en tu universidad",
  description:
    "El tablero donde se reune todo lo que se vende en tu campus: comida, ropa, tecnologia, servicios, diseno y tutorias.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${archivoBlack.variable} ${workSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
