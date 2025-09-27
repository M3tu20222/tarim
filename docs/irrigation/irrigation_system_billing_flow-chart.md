flowchart TD
    %% Fields and Ownership
    subgraph Fields
        Field["Field"]
        FieldOwnership["FieldOwnership"]
        FieldWorkerAssignment["FieldWorkerAssignment"]
    end

    %% Users
    User["User"]

    %% Wells
    subgraph Wells
        Well["Well"]
        WorkerWellAssignment["WorkerWellAssignment"]
        FieldWell["FieldWell"]
    end

    %% Irrigation
    subgraph Irrigation
        IrrigationLog["IrrigationLog"]
        IrrigationFieldUsage["IrrigationFieldUsage"]
        IrrigationOwnerUsage["IrrigationOwnerUsage"]
        IrrigationInventoryUsage["IrrigationInventoryUsage"]
    end

    %% Billing
    subgraph Billing
        WellBillingPeriod["WellBillingPeriod"]
        WellBillingIrrigationUsage["WellBillingIrrigationUsage"]
    end

    %% Relationships
    User -->|owns| FieldOwnership
    User -->|works on| FieldWorkerAssignment
    User -->|assigns| WorkerWellAssignment
    User -->|creates| IrrigationLog

    Field -->|has| FieldOwnership
    Field -->|has| FieldWorkerAssignment
    Field -->|has| FieldWell
    Field -->|is irrigated by| IrrigationFieldUsage

    Well -->|has| WorkerWellAssignment
    Well -->|has| FieldWell
    Well -->|has| IrrigationLog
    Well -->|has| WellBillingPeriod

    FieldOwnership -->|belongs to| Field
    FieldOwnership -->|owned by| User

    FieldWorkerAssignment -->|belongs to| Field
    FieldWorkerAssignment -->|assigned to| User

    FieldWell -->|connects| Field
    FieldWell -->|connects| Well

    WorkerWellAssignment -->|assigns| Well
    WorkerWellAssignment -->|assigned to| User

    IrrigationLog -->|logs| IrrigationFieldUsage
    IrrigationLog -->|logs| IrrigationOwnerUsage
    IrrigationLog -->|logs| IrrigationInventoryUsage
    IrrigationLog -->|belongs to| Well

    IrrigationFieldUsage -->|uses| Field
    IrrigationFieldUsage -->|logs| IrrigationLog

    IrrigationOwnerUsage -->|uses| IrrigationFieldUsage
    IrrigationOwnerUsage -->|owned by| User

    IrrigationInventoryUsage -->|uses| IrrigationLog

    WellBillingPeriod -->|bills| Well
    WellBillingPeriod -->|uses| WellBillingIrrigationUsage

    WellBillingIrrigationUsage -->|bills| IrrigationLog
    WellBillingIrrigationUsage -->|belongs to| WellBillingPeriod
```

This flow chart illustrates the relationships between fields, ownership, wells, irrigation, and billing in the project. The key components are:

1. Fields: Represent the fields in the system, with ownership managed through the FieldOwnership model and worker assignments through FieldWorkerAssignment.

2. Users: Represent the users in the system, who can own fields, work on fields, assign workers to wells, and create irrigation logs.

3. Wells: Represent the wells in the system, with assignments to workers through WorkerWellAssignment and connections to fields through FieldWell.

4. Irrigation: Represents the irrigation system, with logs of irrigation events through IrrigationLog, usage of fields through IrrigationFieldUsage, usage by owners through IrrigationOwnerUsage, and usage of inventory through IrrigationInventoryUsage.

5. Billing: Represents the billing system for wells, with billing periods through WellBillingPeriod and usage of irrigation logs through WellBillingIrrigationUsage.

The relationships between these components are illustrated in the flow chart, showing how they interact with each other in the system.
