import { ProtectedPage } from "@/components/protected-page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserIcon,
  MapIcon,
  DropletIcon,
  TractorIcon,
  BellIcon,
} from "lucide-react";

export default function AdminDashboard() {
  return (
    <ProtectedPage allowedRoles={["ADMIN"]}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight neon-text-purple">
            Admin Paneli
          </h1>
          <p className="text-muted-foreground">
            Sistem yönetimi ve genel bakış
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-background/50 border border-purple-500/30">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="fields">Tarlalar</TabsTrigger>
            <TabsTrigger value="system">Sistem</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-background/50 border-purple-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Toplam Kullanıcı
                  </CardTitle>
                  <UserIcon className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">
                    +2 yeni kullanıcı (son 30 gün)
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-cyan-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Toplam Tarla
                  </CardTitle>
                  <MapIcon className="h-4 w-4 text-cyan-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">42</div>
                  <p className="text-xs text-muted-foreground">
                    +5 yeni tarla (son 30 gün)
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-pink-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sulama Kaydı
                  </CardTitle>
                  <DropletIcon className="h-4 w-4 text-pink-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">128</div>
                  <p className="text-xs text-muted-foreground">
                    +18 yeni kayıt (son 30 gün)
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-green-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    İşleme Kaydı
                  </CardTitle>
                  <TractorIcon className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">76</div>
                  <p className="text-xs text-muted-foreground">
                    +12 yeni kayıt (son 30 gün)
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 bg-background/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle>Sistem Aktivitesi</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Grafik burada görüntülenecek
                  </p>
                </CardContent>
              </Card>

              <Card className="col-span-3 bg-background/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle>Son Bildirimler</CardTitle>
                  <CardDescription>
                    Son 24 saat içindeki sistem bildirimleri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <BellIcon className="h-4 w-4 text-cyan-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Yeni kullanıcı kaydı
                        </p>
                        <p className="text-xs text-muted-foreground">
                          2 saat önce
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <BellIcon className="h-4 w-4 text-pink-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Sistem güncellemesi tamamlandı
                        </p>
                        <p className="text-xs text-muted-foreground">
                          6 saat önce
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <BellIcon className="h-4 w-4 text-purple-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Veri yedeklemesi tamamlandı
                        </p>
                        <p className="text-xs text-muted-foreground">
                          12 saat önce
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-background/50 border-purple-500/30">
              <CardHeader>
                <CardTitle>Kullanıcı Yönetimi</CardTitle>
                <CardDescription>
                  Sistem kullanıcılarını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Kullanıcı tablosu burada görüntülenecek
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            <Card className="bg-background/50 border-purple-500/30">
              <CardHeader>
                <CardTitle>Tarla Yönetimi</CardTitle>
                <CardDescription>Sistem tarlalarını yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tarla tablosu burada görüntülenecek
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card className="bg-background/50 border-purple-500/30">
              <CardHeader>
                <CardTitle>Sistem Ayarları</CardTitle>
                <CardDescription>
                  Sistem yapılandırmasını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sistem ayarları burada görüntülenecek
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedPage>
  );
}
