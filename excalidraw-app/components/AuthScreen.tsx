import React, { useState } from "react";

import { useAtom } from "../app-jotai";
import {
  currentUserAtom,
  isAuthenticatedAtom,
  authErrorAtom,
} from "../store/drawingState";
import { registerUser, loginUser } from "../data/firebase";

type AuthMode = "login" | "register";

export const AuthScreen: React.FC = () => {
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const [, setIsAuthenticated] = useAtom(isAuthenticatedAtom);
  const [, setAuthError] = useAtom(authErrorAtom);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let userCredential;

      if (mode === "register") {
        userCredential = await registerUser(email, password);
      } else {
        userCredential = await loginUser(email, password);
      }

      setCurrentUser(userCredential.user);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err: any) {
      const errorMessage =
        err.code === "auth/user-not-found"
          ? "User not found. Please register first."
          : err.code === "auth/wrong-password"
          ? "Incorrect password."
          : err.code === "auth/email-already-in-use"
          ? "Email already in use."
          : err.code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : err.message || "Authentication failed";

      setError(errorMessage);
      setAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "2rem",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "0.5rem",
            color: "#333",
            fontSize: "1.8rem",
          }}
        >
          Consultidraw
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#999",
            marginBottom: "2rem",
            fontSize: "0.9rem",
          }}
        >
          {mode === "login"
            ? "Sign in to your account"
            : "Create a new account"}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#333",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#333",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem",
                background: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                color: "#c33",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            style={{
              padding: "0.75rem",
              background: isLoading || !email || !password ? "#ccc" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              fontWeight: 500,
              cursor:
                isLoading || !email || !password ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {isLoading
              ? "Loading..."
              : mode === "login"
              ? "Sign In"
              : "Sign Up"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            borderTop: "1px solid #eee",
            paddingTop: "1.5rem",
          }}
        >
          <p
            style={{
              color: "#666",
              fontSize: "0.9rem",
              marginBottom: "0.5rem",
            }}
          >
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </p>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#667eea",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {mode === "login" ? "Create Account" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
