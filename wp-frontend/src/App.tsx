import React from 'react';
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster as HotToaster } from 'react-hot-toast';
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import SendMessage from "./pages/SendMessage";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Templates from "./pages/Templates";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ChatLayout from "./components/ChatLayout";
import DripCampaigns from "./pages/DripCampaigns";
import CreateDripCampaign from "./pages/CreateDripCampaign";
import CampaignDetails from "./pages/CampaignDetails";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HotToaster position="top-right" />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/send" element={<ProtectedRoute><Layout><SendMessage /></Layout></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatLayout><Chat /></ChatLayout></ProtectedRoute>} />
            <Route path="/drip-campaigns" element={<ProtectedRoute><Layout><DripCampaigns /></Layout></ProtectedRoute>} />
            <Route path="/drip-campaigns/create" element={<ProtectedRoute><Layout><CreateDripCampaign /></Layout></ProtectedRoute>} />
            <Route path="/drip-campaigns/:id" element={<ProtectedRoute><Layout><CampaignDetails /></Layout></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute><Layout><Templates /></Layout></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Layout><Contacts /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
