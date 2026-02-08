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
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-xs">
                <Carrot className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold text-foreground">
                Meal Planner
              </span>
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => setShowFeedback(true)}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Help and feedback"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
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

      {/* Unsaved Changes Banner Slot */}
      <div id="unsaved-banner-slot" />

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/80 backdrop-blur-lg md:hidden pb-safe">
        <div className="flex justify-around py-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
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
      <main className="container py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Feedback Modal */}
      <FeedbackModal open={showFeedback} onOpenChange={setShowFeedback} />
    </div>
  );
}
