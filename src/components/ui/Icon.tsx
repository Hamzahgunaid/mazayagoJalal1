import * as Icons from "lucide-react";

type Props = { name?: string; className?: string };

const map: Record<string, keyof typeof Icons> = {
  utensils: "Utensils",
  coffee: "Coffee",
  shopping: "ShoppingBag",
  shopping_bag: "ShoppingBag",
  bag: "ShoppingBag",
  car: "Car",
  hospital: "Hospital",
  home: "Home",
  phone: "Phone",
  briefcase: "BriefcaseBusiness",
  dumbbell: "Dumbbell",
  star: "Star",
  tag: "Tag",
};

export function Icon({ name, className }: Props){
  const key = (name || "").toLowerCase().replace(/-/g,"_");
  const iconName = map[key] || "Tag";
  const Ico = (Icons as any)[iconName] || Icons.Tag;
  return <Ico className={className} />;
}
