"use client";

import { useAuth } from "@/context/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function InvitePage() {
  const { membership } = useAuth();
  const token = membership?.expand?.household?.invite_token;
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== "undefined" && token
    ? `${window.location.origin}/register?invite=${token}`
    : "";

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Invite a Member</h1>
      <Card>
        <CardHeader>
          <CardTitle>Invite link</CardTitle>
          <CardDescription>
            Share this link with a family member. Anyone with this link can join your household.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={inviteUrl} readOnly className="font-mono text-xs" />
          <Button onClick={copy} variant="secondary">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
