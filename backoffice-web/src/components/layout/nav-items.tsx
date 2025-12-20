import { BookOpen, Bot, Briefcase, Building2, FileSignature, Gauge, Image, Megaphone, MessageSquare, Plug, Smartphone } from "lucide-react";
import type React from "react";

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: Gauge },
  { title: "Empresas", href: "/empresas", icon: Building2 },
  { title: "Integrações", href: "/integracoes", icon: Plug },
  { title: "Instâncias", href: "/instancias", icon: Smartphone },
  { title: "Centurions", href: "/centurions", icon: Bot },
  { title: "Mídias", href: "/media", icon: Image },
  { title: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { title: "Deals", href: "/deals", icon: Briefcase },
  { title: "Contratos", href: "/contratos", icon: FileSignature },
  { title: "Marketing", href: "/marketing", icon: Megaphone },
  { title: "Leads", href: "/leads", icon: MessageSquare },
];
