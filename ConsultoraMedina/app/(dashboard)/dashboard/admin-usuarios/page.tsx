import { redirect } from "next/navigation";

/** La gestión de usuarios vive en ADMIN General (pestaña Usuarios). */
export default function AdminUsuariosRedirectPage() {
  redirect("/dashboard/admin-general?tab=usuarios");
}
