import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Carrot, ShoppingBasket, UtensilsCrossed, HelpCircle, Calendar, ChefHat, Menu, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackModal } from '@/components/FeedbackModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Home', href: '/', icon: Carrot },
  { name: 'Plan', href: '/meal-plans', icon: Calendar },
  { name: 'Groceries', href: '/groceries', icon: ShoppingBasket },
  { name: 'Recipes', href: '/recipes', icon: UtensilsCrossed },
  { name: 'Cook', href: '/cook', icon: ChefHat },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [showFeedback, setShowFeedback] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          {/* Left: Logo + Feedback */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-soft">
                <Carrot className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                Meal Planner
              </span>
            </Link>
            <Button
              onClick={() => setShowFeedback(true)}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive"
              aria-label="Help and feedback"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Desktop Nav + Hamburger Menu */}
          <div className="flex items-center gap-2">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Hamburger menu - always far right */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    aria-label="Menu"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Unsaved Changes Banner Slot - rendered via portal from page components */}
      <div id="unsaved-banner-slot" />

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden pb-safe">
        <div className="flex justify-around py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Feedback Modal */}
      <FeedbackModal open={showFeedback} onOpenChange={setShowFeedback} />
    </div>
  );
}
