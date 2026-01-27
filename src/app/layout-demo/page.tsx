import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default function LayoutDemoPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-4xl font-bold">Layout Component Demo</h1>
        <p className="text-muted-foreground">
          Preview the DashboardLayout with different user roles
        </p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal User</TabsTrigger>
          <TabsTrigger value="pt">Personal Trainer</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="org">Organization</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal User Role</CardTitle>
              <CardDescription>
                Personal users can access exercises, workouts, sessions, and analytics for
                themselves.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardLayout userRole="PERSONAL">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Personal User Dashboard</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>My Exercises</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">45</p>
                        <p className="text-sm text-muted-foreground">Total exercises</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>My Workouts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">12</p>
                        <p className="text-sm text-muted-foreground">Active workouts</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Sessions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">89</p>
                        <p className="text-sm text-muted-foreground">Completed sessions</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Badge>Navigation: Dashboard, Exercises, Workouts, Sessions, Analytics</Badge>
                </div>
              </DashboardLayout>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pt" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Trainer Role</CardTitle>
              <CardDescription>
                Personal trainers have all Personal User features plus client management
                capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardLayout userRole="PT">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Personal Trainer Dashboard</h2>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Active Clients</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">18</p>
                        <p className="text-sm text-muted-foreground">Total clients</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Client Workouts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">54</p>
                        <p className="text-sm text-muted-foreground">Assigned workouts</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>My Training</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">67</p>
                        <p className="text-sm text-muted-foreground">Personal sessions</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Exercise Library</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">120</p>
                        <p className="text-sm text-muted-foreground">Custom exercises</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Badge>
                    Navigation: Dashboard, Exercises, Workouts, Sessions, Analytics, Clients
                  </Badge>
                </div>
              </DashboardLayout>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Role</CardTitle>
              <CardDescription>
                Clients can view assigned workouts and track their sessions. Exercise library is
                read-only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardLayout userRole="CLIENT">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Client Dashboard</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>Assigned Workouts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">8</p>
                        <p className="text-sm text-muted-foreground">From your trainer</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>This Week</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">4/5</p>
                        <p className="text-sm text-muted-foreground">Sessions completed</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Trainer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-bold">John Smith</p>
                        <p className="text-sm text-muted-foreground">Personal Trainer</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Badge>Navigation: Dashboard, Workouts, Sessions</Badge>
                </div>
              </DashboardLayout>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="org" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Role</CardTitle>
              <CardDescription>
                Organizations manage trainers and view aggregated analytics across all clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardLayout userRole="ORG">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Organization Dashboard</h2>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Total Trainers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">12</p>
                        <p className="text-sm text-muted-foreground">Active trainers</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Total Clients</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">156</p>
                        <p className="text-sm text-muted-foreground">Across all trainers</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>This Month</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">2,340</p>
                        <p className="text-sm text-muted-foreground">Total sessions</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Adherence Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">87%</p>
                        <p className="text-sm text-muted-foreground">Avg. completion</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Badge>Navigation: Dashboard, Analytics, Clients, Trainers</Badge>
                </div>
              </DashboardLayout>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
