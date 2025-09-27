import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function RecentSales() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>AY</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Ahmet Yılmaz</p>
          <p className="text-sm text-muted-foreground">
            ahmet.yilmaz@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₺1,999.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="flex h-9 w-9 items-center justify-center space-y-0 border">
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Mehmet Kaya</p>
          <p className="text-sm text-muted-foreground">
            mehmet.kaya@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₺39.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>AÇ</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Ayşe Çelik</p>
          <p className="text-sm text-muted-foreground">
            ayse.celik@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₺299.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>FD</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Fatma Demir</p>
          <p className="text-sm text-muted-foreground">
            fatma.demir@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₺99.00</div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>MŞ</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Mustafa Şahin</p>
          <p className="text-sm text-muted-foreground">
            mustafa.sahin@example.com
          </p>
        </div>
        <div className="ml-auto font-medium">+₺2,499.00</div>
      </div>
    </div>
  );
}
