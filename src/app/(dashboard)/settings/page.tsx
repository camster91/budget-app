"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Bell, Shield, Moon, Palette, Globe, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface SettingsField {
    label: string;
    placeholder: string;
    type?: string;
}

interface SettingsSection {
    title: string;
    description: string;
    icon: any;
    fields: SettingsField[];
}

const settingsSections: SettingsSection[] = [
    {
        title: "Profile",
        description: "Manage your personal information and public profile.",
        icon: User,
        fields: [
            { label: "Full Name", placeholder: "Antigravity User" },
            { label: "Email Address", placeholder: "user@antigravity.finance" },
        ]
    },
    {
        title: "Preferences",
        description: "Customize your experience and appearance.",
        icon: Palette,
        fields: [
            { label: "Currency", placeholder: "USD ($)" },
            { label: "Theme", placeholder: "Antigravity Dark" },
        ]
    },
    {
        title: "Security",
        description: "Keep your account secure and manage access.",
        icon: Shield,
        fields: [
            { label: "Password", placeholder: "••••••••••••", type: "password" },
        ]
    }
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
};

export default function SettingsPage() {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-4xl space-y-8"
        >
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gradient mb-1">Settings</h2>
                <p className="text-muted-foreground text-sm font-medium">Manage your account settings and preferences.</p>
            </div>

            <div className="grid gap-6">
                {settingsSections.map((section, i) => (
                    <motion.div key={i} variants={item}>
                        <Card className="border-white/[0.08] bg-white/[0.01]">
                            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <section.icon className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle>{section.title}</CardTitle>
                                    <CardDescription>{section.description}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {section.fields.map((field, j) => (
                                        <div key={j} className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                {field.label}
                                            </label>
                                            <Input
                                                placeholder={field.placeholder}
                                                type={field.type || "text"}
                                                className="rounded-xl border-white/[0.1] bg-white/[0.05] focus:ring-primary"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button variant="outline" size="sm" className="rounded-xl">
                                        Update {section.title}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                <motion.div variants={item}>
                    <Card className="border-red-500/20 bg-red-500/5">
                        <CardHeader>
                            <CardTitle className="text-red-400">Danger Zone</CardTitle>
                            <CardDescription>Irreversible actions for your account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive" className="rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/50">
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}
