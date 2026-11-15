import { logout } from "./actions";
import { LogoutSubmit } from "./submit";
export default function Logout() {
  return <main style={{ padding: 40 }}><h1>Signing out…</h1><LogoutSubmit action={logout} /></main>;
}
