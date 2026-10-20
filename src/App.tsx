
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import BeneficiaryForm from "./pages/BeneficiaryForm";
import BeneficiaryRecords from "./pages/BeneficiaryRecords";
import "./styles.css";

type Page = "dashboard" | "form" | "records";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={signIn}>
        <h2><center>LOGIN</center></h2>
        <p><b>MANMUNAI WEST DIVISIONAL SECRETARIAT</b></p>

        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<Page>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  }

  if (checkingSession) {
    return <main className="login-page">ஏற்றப்படுகிறது...</main>;
  }

  if (!session) return <Login />;

  return (
    <>
      <Header />

      <nav className="main-nav no-print">
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("form")}>+ Add New</button>
        <button onClick={() => setPage("records")}>Records</button>
        <span className="nav-user">{session.user.email}</span>
        <button className="logout-button" onClick={signOut}>Logout</button>
      </nav>

      <main>
        {page === "dashboard" && (
          <Dashboard refreshKey={refreshKey} />
        )}
        {page === "form" && (
          <BeneficiaryForm
            onSaved={() => {
              setRefreshKey((key) => key + 1);
              setPage("dashboard");
            }}
          />
        )}
        {page === "records" && (
          <BeneficiaryRecords refreshKey={refreshKey} />
        )}
      </main>

      <Footer />
    </>
  );
}
