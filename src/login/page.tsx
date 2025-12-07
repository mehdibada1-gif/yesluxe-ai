
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Owner } from '@/lib/types';


const AuthForm = ({
  isSignUp = false,
  email,
  setEmail,
  password,
  setPassword,
  handleSubmit,
  isPending,
  onForgotPassword,
}: {
  isSignUp?: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  onForgotPassword?: () => void;
}) => (
  <form onSubmit={handleSubmit}>
    <CardContent className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={isSignUp ? 'signup-email' : 'signin-email'}>Email</Label>
        <Input
          id={isSignUp ? 'signup-email' : 'signin-email'}
          type="email"
          placeholder="owner@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center">
            <Label htmlFor={isSignUp ? 'signup-password' : 'signin-password'}>Password</Label>
            {!isSignUp && onForgotPassword && (
                 <Button type="button" variant="link" className="ml-auto p-0 h-auto text-xs" onClick={onForgotPassword}>
                    Forgot password?
                 </Button>
            )}
        </div>
        <Input
          id={isSignUp ? 'signup-password' : 'signin-password'}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </CardContent>
    <CardFooter>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
        {isPending ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
      </Button>
    </CardFooter>
  </form>
);

function ForgotPasswordDialog({ open, onOpenChange, onSendResetLink }: { open: boolean, onOpenChange: (open: boolean) => void, onSendResetLink: (email: string) => void }) {
    const [resetEmail, setResetEmail] = useState('');

    const handleSendClick = () => {
        if (resetEmail) {
            onSendResetLink(resetEmail);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Forgot Password</DialogTitle>
                    <DialogDescription>
                        Enter your email address below and we'll send you a link to reset your password.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reset-email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSendClick}>Send Reset Link</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [redirecting, setRedirecting] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  useEffect(() => {
    // If the user object becomes available and we haven't started redirecting, push to dashboard.
    if (!isUserLoading && user && !redirecting) {
      setRedirecting(true); // Mark that we are starting the redirect
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, redirecting]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsPending(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Let the useEffect handle the redirect to avoid race conditions
    } catch (error: any) {
        let description = "An unexpected error occurred. Please try again.";
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                description = "Incorrect email or password. Please check your credentials and try again.";
                break;
            case 'auth/wrong-password':
                 description = "The password you entered is incorrect. Please try again.";
                 break;
            case 'auth/too-many-requests':
                description = "Access to this account has been temporarily disabled due to many failed login attempts. You can reset your password or try again later.";
                break;
            default:
                description = error.message;
        }

        toast({
            variant: "destructive",
            title: "Sign In Failed",
            description: description,
        });
        setIsPending(false);
    }
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setIsPending(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const ownerRef = doc(firestore, 'owners', user.uid);
        const newOwner: Omit<Owner, 'subscriptionTier' | 'subscriptionStatus' > & { subscriptionTier: 'free', subscriptionStatus: 'active' } = {
            id: user.uid,
            email: user.email!,
            name: user.displayName || user.email!.split('@')[0],
            photoURL: user.photoURL || '',
            subscriptionTier: 'free',
            subscriptionStatus: 'active',
        };
        await setDoc(ownerRef, newOwner);
        
        // Let the useEffect handle the redirect
        
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message || "An unexpected error occurred.",
      });
      setIsPending(false);
    }
  };

  const handleSendResetLink = async (resetEmail: string) => {
    if (!auth) return;
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({
            title: "Password Reset Email Sent",
            description: `If an account exists for ${resetEmail}, you will receive an email with instructions.`,
        });
        setForgotPasswordOpen(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Send Email",
            description: "Could not send password reset email. Please try again.",
        });
    }
  };
  
  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Verifying credentials...</p>
        </div>
      </div>
    );
  }
  
  return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-background z-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,180,98,0.15),rgba(255,255,255,0))]"></div>
          </div>
        <Tabs defaultValue="signin" className="w-full max-w-sm z-10">
          <Card className="bg-card/80 backdrop-blur-sm border-border/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-headline">Owner Access</CardTitle>
              <CardDescription className="text-foreground/60 pt-1">
                Sign in or create an account to manage your properties.
              </CardDescription>
              <TabsList className="grid w-full grid-cols-2 mt-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>
            <TabsContent value="signin">
              <AuthForm 
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleSubmit={handleSignIn}
                isPending={isPending}
                onForgotPassword={() => setForgotPasswordOpen(true)}
              />
            </TabsContent>
            <TabsContent value="signup">
              <AuthForm 
                isSignUp
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleSubmit={handleSignUp}
                isPending={isPending}
              />
            </TabsContent>
          </Card>
        </Tabs>
        <ForgotPasswordDialog 
          open={isForgotPasswordOpen}
          onOpenChange={setForgotPasswordOpen}
          onSendResetLink={handleSendResetLink}
        />
      </div>
    );
}
