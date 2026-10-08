import React, { useState } from "react";
import {
  Box, Button, TextField, Typography,
  Grid, InputAdornment, IconButton, Alert,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAppDispatch } from "../../store/hooks";
import { register } from "../../store/slices/authSlice";
import { toast } from "react-toastify";

type FieldErrors = Partial<Record<keyof RegisterFormData, string>>;

// Form order, so focus lands on the first problem a reader would reach.
const FIELD_ORDER: (keyof RegisterFormData)[] = [
  "first_name", "last_name", "username", "email", "password", "password2",
];

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
}

const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterFormData>({
    username: "", email: "", password: "",
    password2: "", first_name: "", last_name: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof RegisterFormData;
    setFormData({ ...formData, [name]: e.target.value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

  // Show the problems next to their fields, announce a summary, and move
  // focus to the first field that needs attention.
  const showErrors = (fields: FieldErrors, message: string) => {
    setErrors(fields);
    setSummary(message);
    const first = FIELD_ORDER.find((name) => fields[name]);
    if (first) setTimeout(() => document.getElementById(`register-${first}`)?.focus());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSummary(null);
    if (formData.password !== formData.password2) {
      showErrors({ password2: "Passwords don't match." }, "Please fix the highlighted field.");
      return;
    }
    setLoading(true);
    try {
      await dispatch(register(formData)).unwrap();
      toast.success("Account created! Welcome to EquiTask.");
      navigate("/dashboard");
    } catch (err: any) {
      const fields: FieldErrors = {};
      for (const name of FIELD_ORDER) {
        if (err?.fields?.[name]) fields[name] = err.fields[name];
      }
      const count = Object.keys(fields).length;
      showErrors(
        fields,
        count
          ? `Please fix the highlighted field${count > 1 ? "s" : ""}.`
          : err?.message || "Registration failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Shared props that tie each field to its error message.
  const fieldProps = (name: keyof RegisterFormData) => ({
    id: `register-${name}`,
    name,
    value: formData[name],
    onChange: handleChange,
    error: Boolean(errors[name]),
    helperText: errors[name],
  });

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Left panel */}
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
          Join your team.
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.8 }}>
          Create your account and start collaborating with your team on a platform designed for fairness and accountability.
        </Typography>
      </Box>
      {/* Right form panel */}
      <Box sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#F5F7FA",
        p: { xs: 3, sm: 4, md: 5 },
      }}>
        <Box sx={{ width: "100%", maxWidth: 440 }}>
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
            Create account
          </Typography>
          <Typography sx={{ color: "#64748B", fontSize: 14, mb: 3 }}>
            Fill in your details to get started.
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            {summary && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
                {summary}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField fullWidth label="First name" {...fieldProps("first_name")} required
                  autoComplete="given-name" />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="Last name" {...fieldProps("last_name")} required
                  autoComplete="family-name" />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Username" {...fieldProps("username")} required
                  autoComplete="username" />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Email address" type="email" {...fieldProps("email")} required
                  autoComplete="email" />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth label="Password" {...fieldProps("password")}
                  type={showPassword ? "text" : "password"} required
                  autoComplete="new-password"
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
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth label="Confirm password" {...fieldProps("password2")}
                  type={showPassword ? "text" : "password"} required
                  autoComplete="new-password"
                />
              </Grid>
              <Grid size={12}>
                <Button
                  type="submit" fullWidth variant="contained" disabled={loading}
                  sx={{
                    py: 1.5, fontSize: 15, fontWeight: 600,
                    bgcolor: "var(--accent)", "&:hover": { bgcolor: "var(--accent-dark)" },
                    borderRadius: "10px", mt: 0.5,
                  }}
                >
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Typography sx={{ mt: 3, textAlign: "center", color: "#64748B", fontSize: 14 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RegisterPage;