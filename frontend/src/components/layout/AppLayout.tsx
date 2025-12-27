import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Carrot, ShoppingBasket, UtensilsCrossed, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackModal } from '@/components/FeedbackModal';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Home', href: '/', icon: Carrot },
  { name: 'Groceries', href: '/groceries', icon: ShoppingBasket },
  { name: 'Recipes', href: '/recipes', icon: UtensilsCrossed },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-soft">
              <Carrot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              Meal Planner
            </span>
          </Link>

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
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg md:hidden">
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

      {/* Floating Feedback Button */}
      <Button
        onClick={() => setShowFeedback(true)}
        size="icon"
        variant="default"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all z-40"
        title="Report a bug or share feedback"
      >
        <Bug className="h-5 w-5" />
      </Button>

      {/* Feedback Modal */}
      <FeedbackModal open={showFeedback} onOpenChange={setShowFeedback} />
    </div>
  );
}
