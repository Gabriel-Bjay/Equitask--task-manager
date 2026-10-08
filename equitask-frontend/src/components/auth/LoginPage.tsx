import React, { useState, useEffect } from "react";
import {
  Box, Button, TextField, Typography,
  InputAdornment, IconButton,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff, CheckCircle, ArrowForward } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { demoLogin, login } from "../../store/slices/authSlice";
import { authService } from "../../services/authService";
import { DemoAccount } from "../../types/auth.types";
import { toast } from "react-toastify";
import WakeNotice, { useWakeNotice } from "../common/WakeNotice";

const features = [
  "Equitable task distribution across your team",
  "Real-time workload tracking and analytics",
  "RAPID principles built into every workflow",
];

const DEMO_ROLES: Record<DemoAccount["role"], { label: string; hint: string }> = {
  manager: { label: "Manager", hint: "Assign work with the recommendations and watch team fairness" },
  team_member: { label: "Team member", hint: "Your tasks, deadlines and notifications" },
};

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Offered only while the API's public demo is on.
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoChecking, setDemoChecking] = useState(true);
  const { waking, track } = useWakeNotice();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let active = true;
    track(authService.demoAccounts())
      .then((accounts) => { if (active) setDemoAccounts(accounts); })
      .catch(() => { /* No demo on this deployment; the form still works. */ })
      .finally(() => { if (active) setDemoChecking(false); });
    return () => { active = false; };
  }, [track]);

  const handleDemo = async (role: DemoAccount["role"]) => {
    setLoading(true);
    try {
      await track(dispatch(demoLogin(role)).unwrap());
      toast.success(`Signed in as the demo ${DEMO_ROLES[role].label.toLowerCase()}.`);
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err || "The demo is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await track(dispatch(login({ email, password })).unwrap());
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Left brand panel */}
      <Box sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "center",
        width: "44%",
        bgcolor: "#1A3C5E",
        p: 6,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Decorative circles */}
        <Box sx={{
          position: "absolute", top: -100, right: -100,
          width: 350, height: 350, borderRadius: "50%",
          bgcolor: "rgb(var(--accent-rgb) / 0.12)",
        }} />
        <Box sx={{
          position: "absolute", bottom: -80, left: -80,
          width: 280, height: 280, borderRadius: "50%",
          bgcolor: "rgb(var(--accent-rgb) / 0.08)",
        }} />

        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 7 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: "13px", bgcolor: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Typography sx={{ color: "white", fontWeight: 800, fontSize: 22 }}>E</Typography>
          </Box>
          <Box>
            <Typography sx={{ color: "white", fontWeight: 700, fontSize: 20, lineHeight: 1 }}>
              EquiTask
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: "0.8px" }}>
              TASK MANAGER
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ color: "white", fontWeight: 700, fontSize: 34, lineHeight: 1.2, mb: 2 }}>
          Fair work,<br />better teams.
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 15, mb: 5, lineHeight: 1.8 }}>
          A task management platform built around equity, transparency, and accountability.
        </Typography>

        {features.map((f) => (
          <Box key={f} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2.5 }}>
            <CheckCircle sx={{ color: "var(--accent)", fontSize: 18, mt: 0.15, flexShrink: 0 }} />
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.5 }}>
              {f}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Right form panel */}
      <Box sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#F5F7FA",
        p: { xs: 3, sm: 5, md: 6 },
      }}>
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1.5, mb: 4 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: "10px", bgcolor: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 16 }}>E</Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#1A3C5E" }}>EquiTask</Typography>
          </Box>

          <Typography sx={{ fontWeight: 700, fontSize: 26, color: "#1A3C5E", mb: 0.5 }}>
            Sign in
          </Typography>
          <Typography sx={{ color: "#64748B", fontSize: 14, mb: 3.5 }}>
            Welcome back — let's get to work.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end" size="small"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 0.5,
                py: 1.5,
                fontSize: 15,
                fontWeight: 600,
                bgcolor: "var(--accent)",
                "&:hover": { bgcolor: "var(--accent-dark)" },
                borderRadius: "10px",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Box>

          <WakeNotice waking={waking} />

          {(demoChecking || demoAccounts.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{
                display: "flex", alignItems: "center", gap: 1.5, mb: 1.5,
                color: "#94A3B8", fontSize: 12.5,
                "&::before, &::after": { content: '""', flex: 1, height: "1px", bgcolor: "#E2E8F0" },
              }}>
                or explore with a demo account
              </Box>
              {demoChecking ? (
                <Typography sx={{ textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                  Loading demo accounts…
                </Typography>
              ) : (
                <>
                  {demoAccounts.map((account) => (
                    <Button
                      key={account.role}
                      fullWidth
                      variant="outlined"
                      disabled={loading}
                      onClick={() => handleDemo(account.role)}
                      sx={{
                        mb: 1, py: 1.25, px: 1.5, gap: 1.5,
                        justifyContent: "flex-start", textAlign: "left", textTransform: "none",
                        borderRadius: "10px", borderColor: "#E2E8F0", bgcolor: "white", color: "#1A3C5E",
                        "&:hover": { borderColor: "var(--accent)", bgcolor: "rgb(var(--accent-rgb) / 0.06)" },
                      }}
                    >
                      <Box component="span" sx={{
                        flexShrink: 0, width: 92, py: 0.5, borderRadius: "7px", textAlign: "center",
                        bgcolor: "#1A3C5E", color: "white", fontSize: 12, fontWeight: 700,
                      }}>
                        {DEMO_ROLES[account.role].label}
                      </Box>
                      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                        <Box component="span" sx={{ display: "block", fontWeight: 600, fontSize: 14 }}>
                          {account.name}
                        </Box>
                        <Box component="span" sx={{ display: "block", color: "#64748B", fontSize: 12.5, lineHeight: 1.4 }}>
                          {DEMO_ROLES[account.role].hint}
                        </Box>
                      </Box>
                      <ArrowForward sx={{ color: "var(--accent)", fontSize: 18 }} />
                    </Button>
                  ))}
                  <Typography sx={{ mt: 0.5, textAlign: "center", color: "#94A3B8", fontSize: 12.5 }}>
                    Shared sample data that resets every week.
                  </Typography>
                </>
              )}
            </Box>
          )}

          <Typography sx={{ mt: 3, textAlign: "center", color: "#64748B", fontSize: 14 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Create one
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;