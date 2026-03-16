import React, { useState, useEffect } from "react";
import {
  Box, Button, TextField, Typography,
  InputAdornment, IconButton,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff, CheckCircle } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { login } from "../../store/slices/authSlice";
import { toast } from "react-toastify";

const features = [
  "Equitable task distribution across your team",
  "Real-time workload tracking and analytics",
  "RAPID principles built into every workflow",
];

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dispatch(login({ email, password })).unwrap();
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
          bgcolor: "rgba(2,128,144,0.12)",
        }} />
        <Box sx={{
          position: "absolute", bottom: -80, left: -80,
          width: 280, height: 280, borderRadius: "50%",
          bgcolor: "rgba(2,128,144,0.08)",
        }} />

        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 7 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: "13px", bgcolor: "#028090",
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
            <CheckCircle sx={{ color: "#028090", fontSize: 18, mt: 0.15, flexShrink: 0 }} />
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
              width: 36, height: 36, borderRadius: "10px", bgcolor: "#028090",
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
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
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
                bgcolor: "#028090",
                "&:hover": { bgcolor: "#025F6B" },
                borderRadius: "10px",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Box>

          <Typography sx={{ mt: 3, textAlign: "center", color: "#64748B", fontSize: 14 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#028090", fontWeight: 600, textDecoration: "none" }}>
              Create one
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;