```mermaid
graph TD
    subgraph "1. Satın Alma Süreci"
        direction LR
        A[Yeni 'Purchase' kaydı oluşturulur] --> B(Purchase);
        A --> C['PurchaseContributor' kayıtları oluşturulur (Her ortak için)];
        C --> D(PurchaseContributor);
    end

    subgraph "2. Envanter Oluşturma (Satın Alım Sonrası)"
        direction LR
        E[Yeni 'Inventory' kaydı oluşturulur] --> F(Inventory);
        E --> G['InventoryOwnership' kayıtları oluşturulur (PurchaseContributor'a göre)];
        G --> H(InventoryOwnership);
        E --> I[Yeni 'InventoryTransaction' kaydı (type: PURCHASE)];
        I --> J(InventoryTransaction);
    end

    subgraph "3. Sulama İşlemi ve Envanter Kullanımı"
        direction TD
        K[Kullanıcı sulama başlatır] --> L[Yeni 'IrrigationLog' kaydı oluşturulur (status: DRAFT)];
        L --> M(IrrigationLog);
        L --> N{Kullanılacak envanter seçilir};
        N --> O{Stok yeterli mi? (Inventory & InventoryOwnership kontrolü)};
        O -- Evet --> P[Yeni 'IrrigationInventoryUsage' kaydı oluşturulur];
        P --> Q(IrrigationInventoryUsage);
        P --> R['IrrigationInventoryOwnerUsage' kayıtları oluşturulur];
        R --> S(IrrigationInventoryOwnerUsage);
        O -- Hayır --> T[Hata: Yetersiz stok];
    end

    subgraph "4. Stok ve Kayıt Güncellemeleri (Kullanım Sonrası)"
        direction LR
        P --> U['Inventory' stoğu güncellenir (azaltılır)];
        U --> V(Inventory);
        P --> W['InventoryOwnership' payı güncellenir (azaltılır)];
        W --> X(InventoryOwnership);
        P --> Y[Yeni 'InventoryTransaction' kaydı (type: USAGE)];
        Y --> Z(InventoryTransaction);
    end

    A --> E;
    L --> P;

    classDef dbModel fill:#f9f,stroke:#333,stroke-width:2px;
    class B,D,F,H,J,M,Q,S,V,X,Z dbModel;
```
