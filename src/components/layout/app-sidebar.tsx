'use client';

import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarGroup,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  BarChart2,
  Settings,
  Building2,
  LogOut,
  Bot,
  Star,
  CreditCard,
  User,
  Send,
  Shield,
  ShieldAlert,
  Database,
  Users,
} from 'lucide-react';
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Owner } from '@/lib/types';
import { doc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const Logo = () => (
    <Image 
        src="https://yes-luxe.com/wp-content/uploads/2022/06/Gemini_Generated_Image_ib8t8lib8t8lib8t-1-removebg-preview.png" 
        alt="Yes-Luxe Logo"
        width={24}
        height={24}
        className="h-6 w-6"
    />
);


export default function AppSidebar() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  
  const ownerRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'owners', user.uid) : null),
    [firestore, user]
  );
  const { data: owner } = useDoc<Owner>(ownerRef);

  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc;

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const ownerDashboardPath = '/dashboard/owner';

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary p-2">
            <Logo />
          </div>
          <div className="flex flex-col">
            <h2 className="font-headline text-lg font-semibold">
              Yes-Luxe
            </h2>
            <p className="text-xs text-muted-foreground">{isSuperAdmin ? 'Super Admin' : 'Owner Panel'}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        <SidebarGroup>
          <SidebarMenuItem>
            <SidebarMenuButton href={isSuperAdmin ? "/dashboard/admin" : ownerDashboardPath} tooltip="Dashboard" isActive={pathname === ownerDashboardPath || pathname === '/dashboard/admin'}>
              <LayoutDashboard />
              Dashboard
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="/dashboard/properties" tooltip="Properties" isActive={pathname.startsWith('/dashboard/properties') || pathname.startsWith('/dashboard/property/')}>
              <Building2 />
              Properties
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="/dashboard/analytics" tooltip="Analytics" isActive={pathname.startsWith('/dashboard/analytics')}>
              <BarChart2 />
              Analytics
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton href="/dashboard/billing" tooltip="Billing" isActive={pathname.startsWith('/dashboard/billing')}>
              <CreditCard />
              Billing
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarGroup>
          {isSuperAdmin && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Admin Panel</div>
                  <SidebarMenuItem>
                      <SidebarMenuButton href="/dashboard/admin" tooltip="User Management" isActive={pathname === '/dashboard/admin'}>
                        <Shield />
                        User Management
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                      <SidebarMenuButton href="/dashboard/admin/owners" tooltip="View Owners" isActive={pathname === '/dashboard/admin/owners'}>
                        <Users />
                        Owners
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                      <SidebarMenuButton href="/dashboard/admin/properties" tooltip="All Properties" isActive={pathname === '/dashboard/admin/properties'}>
                        <Building2 />
                        All Properties
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                      <SidebarMenuButton href="/dashboard/admin/sales" tooltip="Sales Inquiries" isActive={pathname.startsWith('/dashboard/admin/sales')}>
                        <Send />
                        Sales Inquiries
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                      <SidebarMenuButton href="/dashboard/admin/moderation" tooltip="Content Moderation" isActive={pathname.startsWith('/dashboard/admin/moderation')}>
                        <ShieldAlert />
                        Moderation
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                      <SidebarMenuButton href="/dashboard/admin/data-audit" tooltip="Data Audit" isActive={pathname.startsWith('/dashboard/admin/data-audit')}>
                        <Database />
                        Data Audit
                      </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarGroup>
            </>
          )}
      </SidebarMenu>
      <SidebarFooter>
        <SidebarGroup>
          {user && owner && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start h-auto px-2 py-2 text-left">
                        <div className="flex items-center gap-2">
                             <Avatar className="h-9 w-9">
                                <AvatarImage src={owner.photoURL || user.photoURL || ''} alt="User Avatar" />
                                <AvatarFallback>
                                    {owner.name ? owner.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium leading-tight">{owner.name || user.email}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">
                                      {isSuperAdmin ? 'Super Admin' : 'Owner'}
                                    </span>
                                    <Badge variant={owner.subscriptionTier === 'premium' ? 'default' : 'secondary'} className="capitalize py-0 px-1.5 text-[10px] font-light">
                                        {owner.subscriptionTier === 'premium' && <Star className="h-2.5 w-2.5 mr-1" />}
                                        {owner.subscriptionTier}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                         <Link href="/dashboard/profile"><User className="mr-2 h-4 w-4"/> Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        <Settings className="mr-2 h-4 w-4"/>
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          )}
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
