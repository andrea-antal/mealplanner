import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminAPI, type WorkspaceSummary, type InactiveWorkspace, type ErrorLogEntry } from '@/lib/api';
import { toast } from 'sonner';
import {
  Database,
  Trash2,
  RefreshCw,
  Users,
  UtensilsCrossed,
  Calendar,
  ShoppingBasket,
  Loader2,
  AlertTriangle,
  Clock,
  Activity,
  CheckCircle2,
  ChevronRight,
  Lock,
} from 'lucide-react';

// Format relative time
function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const Admin = () => {
  const queryClient = useQueryClient();
  const [inactiveDays, setInactiveDays] = useState(30);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [errorSheetWorkspace, setErrorSheetWorkspace] = useState<string | null>(null);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [hasAdminKey, setHasAdminKey] = useState(() => !!sessionStorage.getItem('adminKey'));

  // Handle admin key from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    if (key) {
      sessionStorage.setItem('adminKey', key);
      setHasAdminKey(true);
      // Clean URL (remove key from address bar for security)
      window.history.replaceState({}, '', '/a');
    }
  }, []);

  // Access denied screen if no admin key
  if (!hasAdminKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>Admin access requires authentication.</p>
            <p className="mt-2 text-sm">
              Access via <code className="bg-muted px-1.5 py-0.5 rounded">/a?key=YOUR_ADMIN_SECRET</code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch workspace summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'workspaces', 'summary'],
    queryFn: () => adminAPI.getWorkspacesSummary(),
  });

  // Fetch empty workspaces
  const { data: emptyData, isLoading: emptyLoading } = useQuery({
    queryKey: ['admin', 'workspaces', 'empty'],
    queryFn: () => adminAPI.getEmptyWorkspaces(),
  });

  // Fetch inactive workspaces
  const { data: inactiveData, isLoading: inactiveLoading } = useQuery({
    queryKey: ['admin', 'workspaces', 'inactive', inactiveDays],
    queryFn: () => adminAPI.getInactiveWorkspaces(inactiveDays),
  });

  // Delete workspace mutation
  const deleteMutation = useMutation({
    mutationFn: (workspaceId: string) => adminAPI.deleteWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      toast.success(`Workspace "${workspaceId}" deleted`);
      // Invalidate all admin queries
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setWorkspaceToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Sync all workspaces mutation
  const syncAllMutation = useMutation({
    mutationFn: () => adminAPI.syncAllWorkspaces(),
    onSuccess: (data) => {
      const workspaceCount = Object.keys(data.results || {}).length;
      toast.success(`Synced ${workspaceCount} workspaces`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Fetch workspace errors when sheet is open
  const { data: errorsData, isLoading: errorsLoading } = useQuery({
    queryKey: ['admin', 'errors', errorSheetWorkspace, showAcknowledged],
    queryFn: () =>
      errorSheetWorkspace
        ? adminAPI.getWorkspaceErrors(errorSheetWorkspace, 50, showAcknowledged)
        : Promise.resolve(null),
    enabled: !!errorSheetWorkspace,
  });

  // Clear errors mutation
  const clearErrorsMutation = useMutation({
    mutationFn: (workspaceId: string) => adminAPI.clearWorkspaceErrors(workspaceId),
    onSuccess: (_, workspaceId) => {
      toast.success(`Errors cleared for "${workspaceId}"`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setErrorSheetWorkspace(null);
    },
    onError: (error) => {
      toast.error(`Failed to clear errors: ${error.message}`);
    },
  });

  // Calculate totals - use ?? 0 to handle undefined values from failed workspace stats
  const workspaces = summaryData?.workspaces || [];
  const totalRecipes = workspaces.reduce((sum, ws) => sum + (ws.recipe_count ?? 0), 0);
  const totalMealPlans = workspaces.reduce((sum, ws) => sum + (ws.meal_plan_count ?? 0), 0);
  const totalMembers = workspaces.reduce((sum, ws) => sum + (ws.member_count ?? 0), 0);
  const totalApiCalls = workspaces.reduce((sum, ws) => sum + (ws.api_requests ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Workspace analytics and management
              </p>
            </div>
            <Button
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
              variant="outline"
            >
              {syncAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync All Workspaces
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" />
                Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData?.count || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Total Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecipes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Meal Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMealPlans}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                API Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApiCalls.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All ({summaryData?.count || 0})
            </TabsTrigger>
            <TabsTrigger value="empty">
              Empty ({emptyData?.count || 0})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({inactiveData?.count || 0})
            </TabsTrigger>
          </TabsList>

          {/* All Workspaces Tab */}
          <TabsContent value="all" className="mt-4">
            {summaryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No workspaces found
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead className="text-center">Recipes</TableHead>
                      <TableHead className="text-center">Meal Plans</TableHead>
                      <TableHead className="text-center">Members</TableHead>
                      <TableHead className="text-center">Groceries</TableHead>
                      <TableHead>Last API Call</TableHead>
                      <TableHead className="text-center">API Calls</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspaces.map((ws: WorkspaceSummary) => (
                      <TableRow key={ws.workspace_id}>
                        <TableCell className="font-medium">
                          {ws.workspace_id}
                        </TableCell>
                        <TableCell className="text-center">{ws.recipe_count}</TableCell>
                        <TableCell className="text-center">{ws.meal_plan_count}</TableCell>
                        <TableCell className="text-center">{ws.member_count}</TableCell>
                        <TableCell className="text-center">{ws.grocery_count}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatRelativeTime(ws.last_api_call)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span>{ws.api_requests}</span>
                          {ws.api_errors > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs cursor-pointer hover:bg-destructive/80"
                              onClick={() => setErrorSheetWorkspace(ws.workspace_id)}
                            >
                              {ws.api_errors} errors
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setWorkspaceToDelete(ws.workspace_id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Empty Workspaces Tab */}
          <TabsContent value="empty" className="mt-4">
            {emptyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (emptyData?.workspaces || []).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBasket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No empty workspaces</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Workspaces with no data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(emptyData?.workspaces || []).map((workspaceId: string) => (
                      <div
                        key={workspaceId}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="font-medium">{workspaceId}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setWorkspaceToDelete(workspaceId)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inactive Workspaces Tab */}
          <TabsContent value="inactive" className="mt-4">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-muted-foreground">Inactive for:</span>
              <Select
                value={inactiveDays.toString()}
                onValueChange={(value) => setInactiveDays(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inactiveLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (inactiveData?.workspaces || []).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No inactive workspaces</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Workspaces inactive for {inactiveDays}+ days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(inactiveData?.workspaces || []).map((ws: InactiveWorkspace) => (
                      <div
                        key={ws.workspace_id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{ws.workspace_id}</span>
                          <span className="text-sm text-muted-foreground ml-3">
                            {ws.days_inactive !== null
                              ? `${ws.days_inactive} days inactive`
                              : 'No activity recorded'}
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setWorkspaceToDelete(ws.workspace_id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Error Details Sheet */}
      <Sheet
        open={errorSheetWorkspace !== null}
        onOpenChange={(open) => !open && setErrorSheetWorkspace(null)}
      >
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Errors: {errorSheetWorkspace}
            </SheetTitle>
            <SheetDescription>
              {errorsData?.count || 0} unacknowledged errors
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Toggle to show/hide acknowledged errors */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">
                Show cleared errors
              </label>
              <Switch
                checked={showAcknowledged}
                onCheckedChange={setShowAcknowledged}
              />
            </div>

            {/* Clear errors button */}
            {errorsData && errorsData.count > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => errorSheetWorkspace && clearErrorsMutation.mutate(errorSheetWorkspace)}
                disabled={clearErrorsMutation.isPending}
              >
                {clearErrorsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Clear All Errors
              </Button>
            )}

            {/* Error list */}
            <ScrollArea className="h-[calc(100dvh-280px)]">
              {errorsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : errorsData?.errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p>No errors to display</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errorsData?.errors.map((error: ErrorLogEntry, index: number) => (
                    <div
                      key={`${error.timestamp}-${index}`}
                      className={cn(
                        "p-3 rounded-lg border",
                        error.acknowledged
                          ? "bg-muted/30 border-muted"
                          : "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={error.acknowledged ? "secondary" : "destructive"}>
                            {error.status_code}
                          </Badge>
                          <code className="text-xs font-mono">
                            {error.method} {error.path}
                          </code>
                        </div>
                        {error.acknowledged && (
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString('en-US', {
                          timeZone: 'America/Los_Angeles',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })} PST
                      </div>
                      <div className="mt-1 text-sm text-destructive">
                        {error.error}
                      </div>
                      {error.response_body && error.response_body !== error.error && (
                        <pre className="mt-2 text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-24 overflow-y-auto">
                          {error.response_body}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={workspaceToDelete !== null}
        onOpenChange={(open) => !open && setWorkspaceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace "{workspaceToDelete}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all data including recipes, meal plans,
              groceries, and household profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => workspaceToDelete && deleteMutation.mutate(workspaceToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
