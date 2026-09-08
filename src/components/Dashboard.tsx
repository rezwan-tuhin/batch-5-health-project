"use client";

import { useAppSelector } from "@/store/hooks";
import PatientDashboard from "@/components/patient/PatientDashboard";
import ProviderDashboard from "@/components/provider/ProviderDashboard";
import RegulatorDashboard from "@/components/regulator/RegulatorDashboard";
import ERDashboard from "@/components/er/ERDashboard";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function Dashboard() {
  const user = useAppSelector((s) => s.auth.user);

  if (!user) return null;

  switch (user.role) {
    case "patient":
      return <PatientDashboard />;
    case "provider":
      return <ProviderDashboard />;
    case "regulator":
      return <RegulatorDashboard />;
    case "er_specialist":
      return <ERDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return null;
  }
}