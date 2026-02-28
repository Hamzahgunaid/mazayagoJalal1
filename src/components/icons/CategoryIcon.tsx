"use client";
import * as React from "react";
import {
  PawPrint, Heart, Building2, Factory, GraduationCap, Cpu, Sparkles, UtensilsCrossed,
  Stethoscope, Palette, Home, Wrench, Scale, Camera, Wallet, Users, Glasses, ShoppingBag,
  Dumbbell, Plane, UtilityPole, Car, ShieldCheck, MapPin
} from "lucide-react";

const map: Record<string, React.ComponentType<any>> = {
  animals: PawPrint,
  beauty: Sparkles,
  business: Building2,
  construction: Factory,
  education: GraduationCap,
  electronics: Cpu,
  entertainment: Camera,
  food: UtensilsCrossed,
  health: Stethoscope,
  hobbies: Palette,
  home: Home,
  homeservices: Wrench,
  legal: Scale,
  media: Camera,
  money: Wallet,
  public: Users,
  vision: Glasses,
  shopping: ShoppingBag,
  sports: Dumbbell,
  travel: Plane,
  utilities: UtilityPole,
  vehicles: Car,
  trust: ShieldCheck,
  location: MapPin,
};

export default function CategoryIcon({ iconKey, className }:{ iconKey?:string; className?:string }){
  const Icon = (iconKey && map[iconKey]) || ShieldCheck;
  return <Icon className={className || "w-5 h-5"} />;
}