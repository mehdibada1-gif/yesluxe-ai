
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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  BarChart2,
  CreditCard,
  User,
  LogOut,
  Building,
  Users,
  ShieldAlert,
  Database,
  Send,
  Star,
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
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc && !isSuperAdminLoading;

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const ownerNavItems = [
    { href: "/dashboard/owner", tooltip: "Dashboard", icon: LayoutDashboard, label: "Dashboard", activeCondition: (path: string) => path === '/dashboard/owner' },
    { href: "/dashboard/properties", tooltip: "Properties", icon: Building, label: "My Properties", activeCondition: (path: string) => path.startsWith('/dashboard/properties') || path.startsWith('/dashboard/property') },
    { href: "/dashboard/analytics", tooltip: "Analytics", icon: BarChart2, label: "Analytics", activeCondition: (path: string) => path.startsWith('/dashboard/analytics') },
    { href: "/dashboard/billing", tooltip: "Billing", icon: CreditCard, label: "Billing", activeCondition: (path: string) => path.startsWith('/dashboard/billing') },
  ];

  const adminNavItems = [
      { href: "/dashboard/admin", tooltip: "Admin Dashboard", icon: LayoutDashboard, label: "Admin Dashboard", activeCondition: (path: string) => path === '/dashboard/admin' },
      { href: "/dashboard/admin/owners", tooltip: "Owners", icon: Users, label: "All Owners", activeCondition: (path: string) => path.startsWith('/dashboard/admin/owners') },
      { href: "/dashboard/admin/properties", tooltip: "All Properties", icon: Building, label: "All Properties", activeCondition: (path: string) => path.startsWith('/dashboard/admin/properties') },
      { href: "/dashboard/admin/sales", tooltip: "Sales", icon: Send, label: "Sales Inquiries", activeCondition: (path: string) => path.startsWith('/dashboard/admin/sales') },
      { href: "/dashboard/admin/moderation", tooltip: "Moderation", icon: ShieldAlert, label: "Moderation", activeCondition: (path: string) => path.startsWith('/dashboard/admin/moderation') },
      { href: "/dashboard/admin/data-audit", tooltip: "Data Audit", icon: Database, label: "Data Audit", activeCondition: (path: string) => path.startsWith('/dashboard/admin/data-audit') },
  ];

  const navItems = isSuperAdmin ? adminNavItems : ownerNavItems;

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
          {navItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton href={item.href} tooltip={item.tooltip} isActive={item.activeCondition(pathname)}>
                <item.icon />
                {item.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarGroup>
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
                     <DropdownMenuItem asChild>
                         <Link href="/dashboard/billing"><CreditCard className="mr-2 h-4 w-4"/> Billing</Link>
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
