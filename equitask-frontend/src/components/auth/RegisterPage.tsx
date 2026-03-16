import React, { useState } from "react";
import {
  Box, Button, TextField, Typography,
  Grid, InputAdornment, IconButton,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAppDispatch } from "../../store/hooks";
import { register } from "../../store/slices/authSlice";
import { toast } from "react-toastify";

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

  const [formData, setFormData] = useState<RegisterFormData>({
    username: "", email: "", password: "",
    password2: "", first_name: "", last_name: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.password2) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await dispatch(register(formData)).unwrap();
      toast.success("Account created! Welcome to EquiTask.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

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
          bgcolor: "rgba(2,128,144,0.12)",
        }} />
        <Box sx={{
          position: "absolute", bottom: -80, left: -80,
          width: 280, height: 280, borderRadius: "50%",
          bgcolor: "rgba(2,128,144,0.08)",
        }} />

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
              width: 36, height: 36, borderRadius: "10px", bgcolor: "#028090",
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
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="First name" name="first_name"
                  value={formData.first_name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last name" name="last_name"
                  value={formData.last_name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Username" name="username"
                  value={formData.username} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Email address" name="email" type="email"
                  value={formData.email} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Password" name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password} onChange={handleChange} required
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
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Confirm password" name="password2"
                  type={showPassword ? "text" : "password"}
                  value={formData.password2} onChange={handleChange} required
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit" fullWidth variant="contained" disabled={loading}
                  sx={{
                    py: 1.5, fontSize: 15, fontWeight: 600,
                    bgcolor: "#028090", "&:hover": { bgcolor: "#025F6B" },
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
            <Link to="/login" style={{ color: "#028090", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RegisterPage;