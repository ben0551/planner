"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getClient } from "@/lib/pocketbase";
import { randomUUID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isInvite = Boolean(inviteToken);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const pb = getClient();

    try {
      // Create user
      const user = await pb.collection("users").create({
        name,
        email,
        password,
        passwordConfirm: password,
      });

      // Sign in
      await pb.collection("users").authWithPassword(email, password);

      if (isInvite) {
        // Join existing household via invite token
        const household = await pb
          .collection("households")
          .getFirstListItem(`invite_token="${inviteToken}"`);
        await pb.collection("memberships").create({
          user: user.id,
          household: household.id,
          role: "member",
        });
      } else {
        // Create new household
        const household = await pb.collection("households").create({
          name: householdName || `${name}'s Home`,
          invite_token: randomUUID(),
        });
        await pb.collection("memberships").create({
          user: user.id,
          household: household.id,
          role: "owner",
        });
      }

      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isInvite ? "Join Household" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isInvite
              ? "You've been invited — create your account to join."
              : "Set up Planner for your household."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {!isInvite && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="household">Household name</Label>
                <Input
                  id="household"
                  placeholder={`${name || "Our"}'s Home`}
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : isInvite ? "Join household" : "Create account"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
