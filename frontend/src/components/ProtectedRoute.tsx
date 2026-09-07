import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  type userLoggedInState = "loading" | "auth" | "unauth";
  const [userLoggedIn, setUserLoggedIn] =
    useState<userLoggedInState>("auth");
  useEffect(() => {
    getCurrentUser()
      .then(() => setUserLoggedIn("auth"))
      .catch(() => setUserLoggedIn("unauth"));
  }, []);
  if (userLoggedIn === "loading")
    return <div style={{ color: "#EFF6FF", padding: 32 }}>Loading...</div>;
  if (userLoggedIn === "unauth") return <Navigate to="/login" replace />;
  return <>{children}</>;
}
