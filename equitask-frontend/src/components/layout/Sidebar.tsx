import React from "react";
import { List, ListItem, ListItemText, ListItemButton } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Sidebar: React.FC = () => {
  return (
    <List>
      <ListItem disablePadding>
        <ListItemButton component={RouterLink} to="/dashboard">
          <ListItemText primary="Dashboard" />
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton component={RouterLink} to="/tasks">
          <ListItemText primary="Tasks" />
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton component={RouterLink} to="/my-tasks">
          <ListItemText primary="My Tasks" />
        </ListItemButton>
      </ListItem>

      {/* Manager/Admin example */}
      <ListItem disablePadding>
        <ListItemButton component={RouterLink} to="/analytics">
          <ListItemText primary="Analytics" />
        </ListItemButton>
      </ListItem>
    </List>
  );
};

export default Sidebar;