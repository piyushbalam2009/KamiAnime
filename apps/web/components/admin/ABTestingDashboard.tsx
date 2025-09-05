import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Play, Pause, TrendingUp, Users, Target, Award, Plus, Eye, Download } from 'lucide-react';

interface ABTest {
  id: string;
  name: string;
  description: string;
  feature: string;
  status: 'active' | 'paused' | 'stopped';
  variants: Array<{
    id: string;
    name: string;
    enabled: boolean;
    config: any;
  }>;
  trafficAllocation: number;
  startDate: Date;
  endDate?: Date;
  targetMetrics: string[];
}

interface TestResults {
  testId: string;
  testName: string;
  status: string;
  results: Record<string, {
    variant: string;
    name: string;
    exposures: number;
    uniqueUsers: number;
    conversions: number;
    conversionRate: number;
    confidence: number;
  }>;
  significance: {
    significant: boolean;
    pValue: number;
    winner: string | null;
  };
}

const ABTestingDashboard: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResults>>({});
  const [templates, setTemplates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTestConfig, setNewTestConfig] = useState({
    name: '',
    description: '',
    feature: '',
    trafficAllocation: 0.5,
    variants: [
      { id: 'control', name: 'Control', enabled: true, config: {} },
      { id: 'variant_a', name: 'Variant A', enabled: true, config: {} }
    ],
    targetMetrics: ['conversion_rate']
  });

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  useEffect(() => {
    fetchTests();
    fetchTemplates();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/admin/ab-tests?action=list', {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        }
      });
      const data = await response.json();
      setTests(data.tests || []);
      
      // Fetch results for each test
      for (const test of data.tests || []) {
        fetchTestResults(test.id);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestResults = async (testId: string) => {
    try {
      const response = await fetch(`/api/admin/ab-tests?action=results&testId=${testId}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        }
      });
      const data = await response.json();
      setTestResults(prev => ({ ...prev, [testId]: data.results }));
    } catch (error) {
      console.error('Failed to fetch test results:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/ab-tests?action=templates', {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        }
      });
      const data = await response.json();
      setTemplates(data.templates || {});
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const createTest = async () => {
    try {
      const response = await fetch('/api/admin/ab-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        },
        body: JSON.stringify({
          action: 'create_test',
          testConfig: newTestConfig
        })
      });
      
      if (response.ok) {
        setCreateDialogOpen(false);
        fetchTests();
        // Reset form
        setNewTestConfig({
          name: '',
          description: '',
          feature: '',
          trafficAllocation: 0.5,
          variants: [
            { id: 'control', name: 'Control', enabled: true, config: {} },
            { id: 'variant_a', name: 'Variant A', enabled: true, config: {} }
          ],
          targetMetrics: ['conversion_rate']
        });
      }
    } catch (error) {
      console.error('Failed to create test:', error);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    try {
      const response = await fetch('/api/admin/ab-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        },
        body: JSON.stringify({
          action: 'create_from_template',
          templateId,
          customConfig: {
            name: `${templates[templateId].name} - ${new Date().toLocaleDateString()}`
          }
        })
      });
      
      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error('Failed to create test from template:', error);
    }
  };

  const toggleTestStatus = async (testId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/ab-tests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        },
        body: JSON.stringify({
          testId,
          updates: { status: newStatus }
        })
      });
      
      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error('Failed to update test status:', error);
    }
  };

  const exportResults = async (testId: string) => {
    try {
      const results = testResults[testId];
      if (!results) return;

      const csvData = Object.values(results.results).map(variant => ({
        Variant: variant.name,
        Exposures: variant.exposures,
        'Unique Users': variant.uniqueUsers,
        Conversions: variant.conversions,
        'Conversion Rate': `${(variant.conversionRate * 100).toFixed(2)}%`,
        Confidence: `${variant.confidence.toFixed(1)}%`
      }));

      const csv = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ab-test-results-${testId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export results:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'stopped': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing Dashboard</h2>
          <p className="text-gray-600">Manage and monitor gamification feature tests</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New A/B Test</DialogTitle>
              <DialogDescription>
                Set up a new A/B test for gamification features
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-name">Test Name</Label>
                  <Input
                    id="test-name"
                    value={newTestConfig.name}
                    onChange={(e) => setNewTestConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter test name"
                  />
                </div>
                <div>
                  <Label htmlFor="feature">Feature</Label>
                  <Input
                    id="feature"
                    value={newTestConfig.feature}
                    onChange={(e) => setNewTestConfig(prev => ({ ...prev, feature: e.target.value }))}
                    placeholder="e.g., xp_system"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTestConfig.description}
                  onChange={(e) => setNewTestConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this test is measuring"
                />
              </div>
              <div>
                <Label htmlFor="traffic">Traffic Allocation ({Math.round(newTestConfig.trafficAllocation * 100)}%)</Label>
                <input
                  type="range"
                  id="traffic"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newTestConfig.trafficAllocation}
                  onChange={(e) => setNewTestConfig(prev => ({ ...prev, trafficAllocation: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTest}>
                  Create Test
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active-tests">Active Tests</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
                <Play className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tests.filter(t => t.status === 'active').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Significant Results</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(testResults).filter(r => r.significance?.significant).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Winners Found</CardTitle>
                <Award className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(testResults).filter(r => r.significance?.winner).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Test Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tests.map(test => {
                  const results = testResults[test.id];
                  const totalUsers = results ? Object.values(results.results).reduce((sum, variant) => sum + variant.uniqueUsers, 0) : 0;
                  return {
                    name: test.name.slice(0, 20) + (test.name.length > 20 ? '...' : ''),
                    users: totalUsers,
                    status: test.status
                  };
                })}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active-tests" className="space-y-4">
          <div className="grid gap-4">
            {tests.filter(test => test.status === 'active').map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {test.name}
                        <Badge className={`${getStatusColor(test.status)} text-white`}>
                          {getStatusIcon(test.status)}
                          {test.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{test.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTestStatus(test.id, test.status === 'active' ? 'paused' : 'active')}
                      >
                        {test.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTest(selectedTest === test.id ? null : test.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Feature:</span> {test.feature}
                    </div>
                    <div>
                      <span className="font-medium">Traffic:</span> {Math.round(test.trafficAllocation * 100)}%
                    </div>
                    <div>
                      <span className="font-medium">Variants:</span> {test.variants.length}
                    </div>
                    <div>
                      <span className="font-medium">Started:</span> {new Date(test.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {selectedTest === test.id && testResults[test.id] && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Variant Performance</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={Object.values(testResults[test.id].results)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value, name) => [
                                name === 'conversionRate' ? `${(value * 100).toFixed(2)}%` : value,
                                name === 'conversionRate' ? 'Conversion Rate' : name
                              ]} />
                              <Bar dataKey="conversionRate" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">User Distribution</h4>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={Object.values(testResults[test.id].results)}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="uniqueUsers"
                                nameKey="name"
                              >
                                {Object.values(testResults[test.id].results).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {testResults[test.id].significance?.significant && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-800">Significant Result Found!</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            Winner: {testResults[test.id].significance.winner} 
                            (p-value: {testResults[test.id].significance.pValue.toFixed(4)})
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid gap-4">
            {tests.map((test) => {
              const results = testResults[test.id];
              if (!results) return null;

              return (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{test.name}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportResults(test.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Variant</th>
                            <th className="text-left p-2">Users</th>
                            <th className="text-left p-2">Conversions</th>
                            <th className="text-left p-2">Rate</th>
                            <th className="text-left p-2">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(results.results).map((variant) => (
                            <tr key={variant.variant} className="border-b">
                              <td className="p-2 font-medium">{variant.name}</td>
                              <td className="p-2">{variant.uniqueUsers}</td>
                              <td className="p-2">{variant.conversions}</td>
                              <td className="p-2">{(variant.conversionRate * 100).toFixed(2)}%</td>
                              <td className="p-2">{variant.confidence.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(templates).map(([templateId, template]: [string, any]) => (
              <Card key={templateId}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Feature:</span> {template.feature}</div>
                    <div><span className="font-medium">Variants:</span> {template.variants.length}</div>
                    <div><span className="font-medium">Metrics:</span> {template.targetMetrics.join(', ')}</div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => createFromTemplate(templateId)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ABTestingDashboard;
