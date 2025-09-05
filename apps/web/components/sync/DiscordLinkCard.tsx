'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Copy, ExternalLink, RefreshCw, Link, Unlink, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface SyncStatus {
  linked: boolean;
  syncEnabled: boolean;
  lastSync?: Date;
  syncVersion?: number;
  discordUsername?: string;
  error?: string;
}

export default function DiscordLinkCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ linked: false, syncEnabled: false });
  const [linkingCode, setLinkingCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch sync status on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchSyncStatus();
    }
  }, [user?.uid]);

  const fetchSyncStatus = async () => {
    if (!user?.uid) return;

    try {
      setRefreshing(true);
      const response = await fetch(`/api/sync/status?userId=${user.uid}`);
      const data = await response.json();

      if (data.success) {
        setSyncStatus({
          linked: data.linked,
          syncEnabled: data.syncEnabled,
          lastSync: data.lastSync ? new Date(data.lastSync) : undefined,
          syncVersion: data.syncVersion,
          discordUsername: data.discordUsername
        });
      } else {
        setSyncStatus({ linked: false, syncEnabled: false, error: data.error });
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
      setSyncStatus({ linked: false, syncEnabled: false, error: 'Failed to fetch status' });
    } finally {
      setRefreshing(false);
    }
  };

  const generateLinkingCode = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const response = await fetch('/api/sync/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });

      const data = await response.json();

      if (data.success) {
        setLinkingCode(data.linkingCode);
        toast({
          title: 'Linking Code Generated!',
          description: 'Copy the code and use it in Discord with /link command.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate linking code',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate linking code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLinkingCode = () => {
    navigator.clipboard.writeText(linkingCode);
    toast({
      title: 'Copied!',
      description: 'Linking code copied to clipboard',
    });
  };

  const forceSyncData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const response = await fetch('/api/sync/force', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sync Initiated',
          description: 'Your data is being synchronized with Discord.',
        });
        // Refresh status after a delay
        setTimeout(fetchSyncStatus, 2000);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to initiate sync',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate sync',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Discord Integration
            </CardTitle>
            <CardDescription>
              Link your Discord account to sync progress and unlock cross-platform features
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSyncStatus}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Connection Status</Label>
            <Badge variant={syncStatus.linked ? 'default' : 'secondary'}>
              {syncStatus.linked ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <AlertCircle className="h-3 w-3 mr-1" />
              )}
              {syncStatus.linked ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>

          {syncStatus.linked && syncStatus.discordUsername && (
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Discord Account</Label>
              <span className="text-sm text-muted-foreground">@{syncStatus.discordUsername}</span>
            </div>
          )}

          {syncStatus.linked && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Sync Status</Label>
                <Badge variant={syncStatus.syncEnabled ? 'default' : 'secondary'}>
                  {syncStatus.syncEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Last Sync</Label>
                <span className="text-sm text-muted-foreground">
                  {formatLastSync(syncStatus.lastSync)}
                </span>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Linking Section */}
        {!syncStatus.linked ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Link Your Discord Account</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a linking code to connect your Discord account and enable cross-platform sync.
              </p>
            </div>

            {!linkingCode ? (
              <Button onClick={generateLinkingCode} disabled={loading} className="w-full">
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Generate Linking Code
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="linking-code">Your Linking Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="linking-code"
                      value={linkingCode}
                      readOnly
                      className="font-mono text-center text-lg tracking-wider"
                    />
                    <Button variant="outline" size="icon" onClick={copyLinkingCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Next Steps:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Copy the linking code above</li>
                    <li>Open Discord and type <code className="bg-background px-1 rounded">/link</code></li>
                    <li>Paste your linking code when prompted</li>
                    <li>Your accounts will be linked automatically!</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⏰ Code expires in 10 minutes
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setLinkingCode('')}
                  className="w-full"
                >
                  Generate New Code
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Sync Management</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Your Discord account is connected! Manage your sync settings below.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={forceSyncData} disabled={loading} variant="outline">
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Force Sync
              </Button>

              <Button variant="destructive" disabled={loading}>
                <Unlink className="h-4 w-4 mr-2" />
                Unlink Account
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">What's Synced?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• XP and level progress</li>
                <li>• Badges and achievements</li>
                <li>• Daily streaks</li>
                <li>• Quest progress</li>
                <li>• Watch and read history</li>
              </ul>
            </div>
          </div>
        )}

        {syncStatus.error && (
          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
            <p className="text-sm text-destructive">{syncStatus.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
