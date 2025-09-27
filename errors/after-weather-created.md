npm run lint

> my-v0-project@0.1.0 lint
> next lint


 ⚠ The Next.js plugin was not detected in your ESLint configuration. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config

./app/api/auth/refresh/route.ts
6:28  Warning: 'request' is defined but never used.  @typescript-eslint/no-unused-vars

./app/api/billing/owner-bills/[id]/pay/route.ts
5:3  Warning: 'FieldOwnerExpense' is defined but never used.  @typescript-eslint/no-unused-vars
6:3  Warning: 'Debt' is defined but never used.  @typescript-eslint/no-unused-vars

./app/api/billing/owner-bills/[id]/route.ts
3:10  Warning: 'FieldOwnerExpense' is defined but never used.  @typescript-eslint/no-unused-vars

./app/api/billing/periods/[id]/distribute/route.ts
182:9  Warning: 'sumRoundedShares' is never reassigned. Use 'const' instead.  prefer-const
183:9  Warning: 'roundingDiff' is never reassigned. Use 'const' instead.  prefer-const
208:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
254:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/billing/periods/[id]/record-payment/route.ts
112:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
123:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/billing/periods/[id]/reverse-payment/route.ts
72:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/debts/route.ts
26:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/equipment/route.ts
23:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
117:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
141:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/fields/route.ts
11:6  Warning: 'FieldWithRelations' is defined but never used.  @typescript-eslint/no-unused-vars
43:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
189:7  Warning: 'notes' is assigned a value but never used.  @typescript-eslint/no-unused-vars
220:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
256:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/fields/[id]/profit-loss/[seasonId]/route.ts
67:11  Warning: 'fieldExpenses' is assigned a value but never used.  @typescript-eslint/no-unused-vars
75:11  Warning: 'irrigationFieldExpenses' is assigned a value but never used.  @typescript-eslint/no-unused-vars
83:9  Warning: 'plantingCosts' is never reassigned. Use 'const' instead.  prefer-const
91:9  Warning: 'maintenanceCosts' is never reassigned. Use 'const' instead.  prefer-const
100:9  Warning: 'harvestCosts' is never reassigned. Use 'const' instead.  prefer-const

./app/api/fields/[id]/route.ts
6:6  Warning: 'FieldAssignmentType' is defined but never used.  @typescript-eslint/no-unused-vars
122:11  Warning: 'currentWellIds' is assigned a value but never used.  @typescript-eslint/no-unused-vars
263:11  Warning: 'updatedFieldResult' is assigned a value but never used.  @typescript-eslint/no-unused-vars
359:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/inventory/reports/route.ts
26:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/inventory/route.ts
35:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/inventory/[id]/route.ts
217:11  Warning: 'userId' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/api/irrigation/route.ts
8:7  Warning: 'round' is assigned a value but never used.  @typescript-eslint/no-unused-vars
29:11  Warning: 'FieldIrrigationInput' is defined but never used.  @typescript-eslint/no-unused-vars
36:11  Warning: 'OwnerDurationInput' is defined but never used.  @typescript-eslint/no-unused-vars
43:11  Warning: 'InventoryDeductionInput' is defined but never used.  @typescript-eslint/no-unused-vars
51:6  Warning: 'IrrigationFieldUsageWithFieldAndOwners' is defined but never used.  @typescript-eslint/no-unused-vars

./app/api/irrigation/stats/route.ts
25:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
168:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/irrigation/[irrigationId]/details/route.ts
50:6  Warning: 'IrrigationFieldUsageWithFieldAndOwners' is defined but never used.  @typescript-eslint/no-unused-vars
71:27  Warning: 'paramIrrigationId' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/api/irrigation/[irrigationId]/finalize/route.ts
8:7  Warning: 'round' is assigned a value but never used.  @typescript-eslint/no-unused-vars
36:6  Warning: 'IrrigationFieldUsageWithFieldAndOwners' is defined but never used.  @typescript-eslint/no-unused-vars
68:29  Warning: 'costAllocations' is assigned a value but never used.  @typescript-eslint/no-unused-vars
70:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/irrigation/[irrigationId]/route.ts
12:7  Warning: 'data' is defined but never used.  @typescript-eslint/no-unused-vars
250:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/notifications/route.ts
10:11  Warning: 'userRole' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/api/notifications/summary/route.ts
5:46  Warning: 'NotificationType' is defined but never used.  @typescript-eslint/no-unused-vars
43:27  Warning: 'request' is defined but never used.  @typescript-eslint/no-unused-vars

./app/api/notifications/[id]/route.ts
52:11  Warning: 'data' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/api/payments/route.ts
5:27  Warning: 'request' is defined but never used.  @typescript-eslint/no-unused-vars

./app/api/processes/finalize/route.ts
72:17  Warning: 'inventoryMap' is never reassigned. Use 'const' instead.  prefer-const
73:17  Warning: 'inventoryToPurchaseMap' is never reassigned. Use 'const' instead.  prefer-const
100:17  Warning: 'purchasePriceMap' is never reassigned. Use 'const' instead.  prefer-const
213:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
235:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/processes/route.ts
28:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
90:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
100:9  Warning: 'costsMap' is never reassigned. Use 'const' instead.  prefer-const
100:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
219:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
241:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
351:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
405:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
515:21  Warning: 'ownerTotalFuel' is never reassigned. Use 'const' instead.  prefer-const
535:43  Warning: 'updatedInventory' is assigned a value but never used.  @typescript-eslint/no-unused-vars
578:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
600:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/processes/[id]/route.ts
77:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
175:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
295:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
338:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
385:11  Warning: 'inventoryMap' is never reassigned. Use 'const' instead.  prefer-const
386:11  Warning: 'inventoryToPurchaseMap' is never reassigned. Use 'const' instead.  prefer-const
413:11  Warning: 'purchasePriceMap' is never reassigned. Use 'const' instead.  prefer-const
530:16  Warning: 'fieldExpense' is assigned a value but never used.  @typescript-eslint/no-unused-vars
655:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./app/api/purchase-templates/route.ts
89:11  Warning: 'userRole' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/api/purchases/route.ts
10:8  Warning: 'Purchase' is defined but never used.  @typescript-eslint/no-unused-vars
118:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
184:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
230:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
288:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
381:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/purchases/[id]/route.ts
4:15  Warning: 'Purchase' is defined but never used.  @typescript-eslint/no-unused-vars
4:25  Warning: 'InventoryTransaction' is defined but never used.  @typescript-eslint/no-unused-vars
4:47  Warning: 'Debt' is defined but never used.  @typescript-eslint/no-unused-vars
4:53  Warning: 'PurchaseContributor' is defined but never used.  @typescript-eslint/no-unused-vars
4:85  Warning: 'InventoryOwnership' is defined but never used.  @typescript-eslint/no-unused-vars
64:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
122:14  Warning: Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free.  @typescript-eslint/ban-ts-comment
126:14  Warning: Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free.  @typescript-eslint/ban-ts-comment
132:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
143:114  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
146:16  Warning: Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free.  @typescript-eslint/ban-ts-comment
148:16  Warning: Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free.  @typescript-eslint/ban-ts-comment
200:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
237:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
364:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
528:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/seasons/route.ts
26:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/users/route.ts
59:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/users/[id]/route.ts
85:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/webhooks/notifications/route.ts
53:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
68:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
99:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
136:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/wells/route.ts
26:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/api/worker/processes/route.ts
50:9  Warning: 'whereCondition' is never reassigned. Use 'const' instead.  prefer-const
50:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/auth/page.tsx
20:11  Warning: 'toast' is assigned a value but never used.  @typescript-eslint/no-unused-vars
29:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
138:17  Warning: Visible, non-interactive elements with click handlers must have at least one keyboard listener.  jsx-a11y/click-events-have-key-events
138:17  Warning: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.  jsx-a11y/no-static-element-interactions        
145:17  Warning: Visible, non-interactive elements with click handlers must have at least one keyboard listener.  jsx-a11y/click-events-have-key-events
145:17  Warning: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.  jsx-a11y/no-static-element-interactions        
152:17  Warning: Visible, non-interactive elements with click handlers must have at least one keyboard listener.  jsx-a11y/click-events-have-key-events
152:17  Warning: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.  jsx-a11y/no-static-element-interactions        

./app/dashboard/DashboardLayoutClient.tsx
11:10  Warning: 'SidebarTrigger' is defined but never used.  @typescript-eslint/no-unused-vars
13:16  Warning: 'X' is defined but never used.  @typescript-eslint/no-unused-vars
64:11  Warning: 'open' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/layout.tsx
21:9  Warning: 'defaultOpen' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/notifications/page.tsx
5:10  Warning: 'getSession' is defined but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/billing/periods/[id]/page.tsx
59:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
99:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
167:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
236:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
253:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/dashboard/owner/debts/[id]/page.tsx
27:3  Warning: 'Trash' is defined but never used.  @typescript-eslint/no-unused-vars
28:3  Warning: 'AlertTriangle' is defined but never used.  @typescript-eslint/no-unused-vars
29:3  Warning: 'CheckCircle' is defined but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/equipment/[id]/edit/page.tsx
12:10  Warning: 'ArrowLeft' is defined but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/equipment/[id]/page.tsx
18:3  Warning: '_props' is defined but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/fields/[id]/edit/page.tsx
21:11  Warning: 'EditFieldPageProps' is defined but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/fields/[id]/page.tsx
33:11  Warning: 'id' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/inventory/[id]/page.tsx
285:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
289:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
290:69  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./app/dashboard/owner/notifications/page.tsx
3:15  Warning: 'Metadata' is defined but never used.  @typescript-eslint/no-unused-vars
11:10  Warning: 'Badge' is defined but never used.  @typescript-eslint/no-unused-vars
27:10  Warning: 'unreadCount' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/processes/[id]/page.tsx
25:39  Warning: 'userId' is defined but never used.  @typescript-eslint/no-unused-vars
25:55  Warning: 'userRole' is defined but never used.  @typescript-eslint/no-unused-vars
65:10  Warning: 'ProcessDetailSkeleton' is defined but never used.  @typescript-eslint/no-unused-vars
137:13  Warning: Do not use an `<a>` element to navigate to `/dashboard/owner/processes/`. Use `<Link />` from `next/link` instead. See: https://nextjs.org/docs/messages/no-html-link-for-pages  @next/next/no-html-link-for-pages

./app/dashboard/owner/reports/harvest-profit/page.tsx
25:3  Warning: 'Fuel' is defined but never used.  @typescript-eslint/no-unused-vars
141:16  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
172:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
236:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
258:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control

./app/dashboard/owner/reports/page.tsx
15:10  Warning: 'addDays' is defined but never used.  @typescript-eslint/no-unused-vars
61:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
105:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
128:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
149:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control

./app/dashboard/owner/seasons/[id]/page.tsx
38:11  Warning: 'id' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/dashboard/owner/wells/[id]/page.tsx
22:11  Warning: 'id' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./app/test-auth/page.tsx
16:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
104:22  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./components/app-sidebar.tsx
25:3  Warning: 'Receipt' is defined but never used.  @typescript-eslint/no-unused-vars
157:13  Warning: Visible, non-interactive elements with click handlers must have at least one keyboard listener.  jsx-a11y/click-events-have-key-events
157:13  Warning: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.  jsx-a11y/no-static-element-interactions        

./components/auth-provider.tsx
39:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
196:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/billing/billing-period-form.tsx
106:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/billing/distribute-bill-dialog.tsx
69:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/billing/new-period-form.tsx
96:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/billing/periods-table.tsx
24:29  Warning: 'Well' is defined but never used.  @typescript-eslint/no-unused-vars
77:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/billing/record-payment-dialog.tsx
140:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
151:12  Warning: 'ownerId' is defined but never used.  @typescript-eslint/no-unused-vars

./components/billing/well-bill-form.tsx
175:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/dashboard/dashboard-stats.tsx
31:3  Warning: 'icon' is defined but never used.  @typescript-eslint/no-unused-vars

./components/dashboard/recent-activity.tsx
117:37  Warning: 'index' is defined but never used.  @typescript-eslint/no-unused-vars

./components/dashboard-header.tsx
47:15  Warning: The autoFocus prop should not be used, as it can reduce usability and accessibility for users.  jsx-a11y/no-autofocus

./components/dashboard-nav.tsx
20:3  Warning: 'Landmark' is defined but never used.  @typescript-eslint/no-unused-vars
118:9  Warning: 'getRoleSpecificPath' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./components/debts/debt-form.tsx
147:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/debts/debt-list.tsx
126:17  Warning: 'setDebts' is assigned a value but never used.  @typescript-eslint/no-unused-vars
342:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
381:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
421:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
450:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
483:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
516:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
545:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
601:13  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control

./components/debts/debt-payment-form.tsx
103:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/debts/debt-reminder.tsx
133:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/equipment/equipment-form.tsx
73:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
145:9  Warning: 'removeOwnership' is assigned a value but never used.  @typescript-eslint/no-unused-vars
192:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/equipment/equipment-table.tsx
80:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
81:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
98:6  Warning: React Hook useEffect has missing dependencies: 'fetchEquipment' and 'fetchOwners'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
117:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
210:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/fields/field-form.tsx
91:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
102:10  Warning: 'activeSeasonId' is assigned a value but never used.  @typescript-eslint/no-unused-vars
180:74  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
223:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
308:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/fields/field-ownership-form.tsx
150:9  Warning: 'epsilon' is assigned a value but never used.  @typescript-eslint/no-unused-vars
171:40  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
171:51  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./components/fields/fields-list.tsx
30:3  Warning: 'AlertDialog' is defined but never used.  @typescript-eslint/no-unused-vars
31:3  Warning: 'AlertDialogAction' is defined but never used.  @typescript-eslint/no-unused-vars
32:3  Warning: 'AlertDialogCancel' is defined but never used.  @typescript-eslint/no-unused-vars
33:3  Warning: 'AlertDialogContent' is defined but never used.  @typescript-eslint/no-unused-vars
34:3  Warning: 'AlertDialogDescription' is defined but never used.  @typescript-eslint/no-unused-vars
35:3  Warning: 'AlertDialogFooter' is defined but never used.  @typescript-eslint/no-unused-vars
36:3  Warning: 'AlertDialogHeader' is defined but never used.  @typescript-eslint/no-unused-vars
37:3  Warning: 'AlertDialogTitle' is defined but never used.  @typescript-eslint/no-unused-vars
111:10  Warning: 'deleteId' is assigned a value but never used.  @typescript-eslint/no-unused-vars
111:20  Warning: 'setDeleteId' is assigned a value but never used.  @typescript-eslint/no-unused-vars
113:9  Warning: 'router' is assigned a value but never used.  @typescript-eslint/no-unused-vars
141:6  Warning: React Hook useEffect has a missing dependency: 'fetchFields'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
258:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/fields/new-field-form.tsx
92:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
101:10  Warning: 'activeSeasonId' is assigned a value but never used.  @typescript-eslint/no-unused-vars
248:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/fields/processing-form.tsx
29:10  Warning: 'selectedInventoryId' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./components/inventory/inventory-actions.tsx
29:9  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
107:63  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
107:75  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./components/inventory/inventory-category-update.tsx
67:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/inventory/inventory-form.tsx
63:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
114:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/inventory/inventory-report.tsx
103:9  Warning: 'router' is assigned a value but never used.  @typescript-eslint/no-unused-vars
106:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
107:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
108:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
192:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
206:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
223:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
231:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
239:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
500:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
545:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
582:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
628:65  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
689:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
757:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/inventory/inventory-selector.tsx
36:3  Warning: 'label' is assigned a value but never used.  @typescript-eslint/no-unused-vars
37:3  Warning: 'required' is assigned a value but never used.  @typescript-eslint/no-unused-vars
42:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
58:6  Warning: React Hook useEffect has a missing dependency: 'fetchInventory'. Either include it or remove the dependency array. 
 react-hooks/exhaustive-deps

./components/inventory/inventory-table.tsx
49:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
57:6  Warning: React Hook useEffect has a missing dependency: 'fetchInventory'. Either include it or remove the dependency array. 
 react-hooks/exhaustive-deps
81:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
85:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/irrigation/irrigation-form.tsx
3:40  Warning: 'useCallback' is defined but never used.  @typescript-eslint/no-unused-vars
10:59  Warning: 'UserIcon' is defined but never used.  @typescript-eslint/no-unused-vars
249:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
279:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
295:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
312:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
320:6  Warning: React Hook useEffect has a missing dependency: 'isEditMode'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
364:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
377:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
412:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
512:52  Warning: 'owners' is defined but never used.  @typescript-eslint/no-unused-vars
513:55  Warning: 'userName' is defined but never used.  @typescript-eslint/no-unused-vars
531:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
642:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
802:53  Warning: 'userName' is defined but never used.  @typescript-eslint/no-unused-vars
821:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
846:9  Warning: 'getOwnerShareForGroup' is assigned a value but never used.  @typescript-eslint/no-unused-vars
985:89  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
985:111  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./components/irrigation/irrigation-list.tsx
3:20  Warning: 'useEffect' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'Filter' is defined but never used.  @typescript-eslint/no-unused-vars
105:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
178:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
182:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
278:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
302:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
326:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
436:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/irrigation/irrigation-stats.tsx
121:6  Warning: React Hook useEffect has missing dependencies: 'fetchFields' and 'fetchSeasons'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
125:6  Warning: React Hook useEffect has a missing dependency: 'fetchStats'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
266:15  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
288:15  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
310:15  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control

./components/login-form.tsx
4:20  Warning: 'useEffect' is defined but never used.  @typescript-eslint/no-unused-vars
30:9  Warning: 'router' is assigned a value but never used.  @typescript-eslint/no-unused-vars
126:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/main-sidebar.tsx
104:9  Warning: Visible, non-interactive elements with click handlers must have at least one keyboard listener.  jsx-a11y/click-events-have-key-events
104:9  Warning: Avoid non-native interactive elements. If using native HTML is not possible, add an appropriate role and support for tabbing, mouse, keyboard, and touch inputs to an interactive content element.  jsx-a11y/no-static-element-interactions

./components/notifications/notification-list.tsx
70:3  Warning: 'role' is assigned a value but never used.  @typescript-eslint/no-unused-vars
160:18  Warning: 'jsonError' is defined but never used.  @typescript-eslint/no-unused-vars
170:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
178:6  Warning: React Hook useCallback has an unnecessary dependency: 'apiUrl'. Either exclude it or remove the dependency array. 
 react-hooks/exhaustive-deps

./components/notifications/notification-send-form.tsx
68:3  Warning: 'userId' is defined but never used.  @typescript-eslint/no-unused-vars
69:3  Warning: 'role' is assigned a value but never used.  @typescript-eslint/no-unused-vars
116:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/payments/payment-form.tsx
119:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/processes/inventory-group.tsx
64:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
81:10  Warning: 'unitMismatch' is assigned a value but never used.  @typescript-eslint/no-unused-vars
84:9  Warning: 'filteredInventoryTypes' is assigned a value but never used.  @typescript-eslint/no-unused-vars
162:11  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
178:11  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control

./components/processes/process-actions.tsx
29:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/processes/process-details.tsx
25:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
123:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
138:72  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
171:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
207:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
223:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
224:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
252:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
269:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
270:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
308:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/processes/process-form.backup.tsx
115:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
119:7  Warning: 'getCategoryForProcess' is assigned a value but never used.  @typescript-eslint/no-unused-vars
141:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
142:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
143:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
144:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
146:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
147:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
160:9  Warning: 'currentProcessType' is assigned a value but never used.  @typescript-eslint/no-unused-vars
245:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
245:7  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
255:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
262:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
289:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
289:7  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
297:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
377:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
439:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/processes/process-form.tsx
3:31  Warning: 'useMemo' is defined but never used.  @typescript-eslint/no-unused-vars
8:39  Warning: 'Trash' is defined but never used.  @typescript-eslint/no-unused-vars
22:10  Warning: 'Input' is defined but never used.  @typescript-eslint/no-unused-vars
40:10  Warning: 'InventorySelector' is defined but never used.  @typescript-eslint/no-unused-vars
134:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
156:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
157:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
158:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
159:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
161:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
162:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
250:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
292:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
337:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
347:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
347:7  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
357:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
363:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
363:7  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
459:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
546:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
602:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
655:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/processes/process-table.tsx
45:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
127:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
141:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
144:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/purchases/edit-purchase-form.tsx
102:60  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
111:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
189:69  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
190:71  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
306:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/purchases/enhanced-purchase-form.tsx
14:25  Warning: 'Template' is defined but never used.  @typescript-eslint/no-unused-vars
47:10  Warning: 'Switch' is defined but never used.  @typescript-eslint/no-unused-vars
50:10  Warning: 'Alert' is defined but never used.  @typescript-eslint/no-unused-vars
50:17  Warning: 'AlertDescription' is defined but never used.  @typescript-eslint/no-unused-vars
50:35  Warning: 'AlertTitle' is defined but never used.  @typescript-eslint/no-unused-vars
122:10  Warning: 'templates' is assigned a value but never used.  @typescript-eslint/no-unused-vars
122:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
123:10  Warning: 'selectedTemplate' is assigned a value but never used.  @typescript-eslint/no-unused-vars
123:28  Warning: 'setSelectedTemplate' is assigned a value but never used.  @typescript-eslint/no-unused-vars
124:10  Warning: 'seasons' is assigned a value but never used.  @typescript-eslint/no-unused-vars
161:35  Warning: 'update' is assigned a value but never used.  @typescript-eslint/no-unused-vars
170:9  Warning: 'isTemplate' is assigned a value but never used.  @typescript-eslint/no-unused-vars
264:65  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
332:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/purchases/new-purchase-form.tsx
9:18  Warning: 'startOfDay' is defined but never used.  @typescript-eslint/no-unused-vars
23:10  Warning: 'Textarea' is defined but never used.  @typescript-eslint/no-unused-vars
42:10  Warning: 'Switch' is defined but never used.  @typescript-eslint/no-unused-vars
45:6  Warning: 'ProductCategory' is defined but never used.  @typescript-eslint/no-unused-vars
107:7  Warning: 'DueDateField' is assigned a value but never used.  @typescript-eslint/no-unused-vars
107:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
163:10  Warning: 'saveAsTemplate' is assigned a value but never used.  @typescript-eslint/no-unused-vars
218:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
284:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
348:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/purchases/purchase-actions.tsx
28:59  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
66:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
116:57  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
116:76  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./components/purchases/purchase-approval.tsx
125:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
165:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/purchases/purchase-details.tsx
80:59  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
233:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
282:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
316:71  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/purchases/purchase-template-list.tsx
33:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/purchases/related-records-panel.tsx
9:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
59:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
72:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
86:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
90:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
93:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
134:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/seasons/season-form.tsx
116:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/seasons/season-list.tsx
105:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
155:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/theme-toggle.tsx
14:21  Warning: 'theme' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./components/ui/alert.tsx
39:3  Warning: Headings must have content and the content must be accessible by a screen reader.  jsx-a11y/heading-has-content    

./components/ui/calendar.tsx
4:10  Warning: 'ChevronLeftIcon' is defined but never used.  @typescript-eslint/no-unused-vars
4:27  Warning: 'ChevronRightIcon' is defined but never used.  @typescript-eslint/no-unused-vars

./components/ui/chart.tsx
72:7  Warning: '_' is defined but never used.  @typescript-eslint/no-unused-vars

./components/ui/command.tsx
42:52  Warning: Unknown property 'cmdk-input-wrapper' found  react/no-unknown-property

./components/ui/pagination.tsx
48:3  Warning: Anchors must have content and the content must be accessible by a screen reader.  jsx-a11y/anchor-has-content      

./components/ui/sidebar.tsx
25:7  Warning: 'SIDEBAR_WIDTH' is assigned a value but never used.  @typescript-eslint/no-unused-vars
27:7  Warning: 'SIDEBAR_WIDTH_ICON' is assigned a value but never used.  @typescript-eslint/no-unused-vars
65:7  Warning: 'style' is defined but never used.  @typescript-eslint/no-unused-vars

./components/ui/use-toast.ts
20:7  Warning: 'actionTypes' is assigned a value but only used as a type.  @typescript-eslint/no-unused-vars

./components/user-table.tsx
67:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/users/add-user-dialog.tsx
45:11  Warning: 'AddUserDialogProps' is defined but never used.  @typescript-eslint/no-unused-vars
99:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/users/delete-user-dialog.tsx
62:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/users/edit-user-dialog.tsx
78:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
113:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
179:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
197:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/users/user-table.tsx
57:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
66:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/wells/well-form.tsx
72:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
143:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/wells/well-list.tsx
164:46  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
164:56  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./components/worker/process-update-form.tsx
6:10  Warning: 'Input' is defined but never used.  @typescript-eslint/no-unused-vars
15:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker/worker-field-detail.tsx
20:10  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
21:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
22:9  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
30:3  Warning: 'userId' is defined but never used.  @typescript-eslint/no-unused-vars
105:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
170:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker/worker-fields-list.tsx
16:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
62:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker/worker-irrigation-form.tsx
157:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
170:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
257:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
286:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
319:57  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
334:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
450:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
451:5  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
452:5  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
453:5  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
555:64  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
562:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
575:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
621:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1072:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1115:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1118:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1120:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker/worker-irrigation-list.tsx
28:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
37:6  Warning: React Hook useEffect has a missing dependency: 'fetchIrrigations'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./components/worker/worker-overview.tsx
28:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
30:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
31:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
33:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker/worker-process-form.tsx
99:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
171:7  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
185:7  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
185:42  Warning: React Hook useEffect has a complex expression in the dependency array. Extract it to a separate variable so it can be statically checked.  react-hooks/exhaustive-deps
238:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker/worker-process-list.tsx
29:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
39:6  Warning: React Hook useEffect has a missing dependency: 'fetchProcesses'. Either include it or remove the dependency array. 
 react-hooks/exhaustive-deps
84:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker/worker-settings.tsx
41:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
89:6  Warning: React Hook useEffect has an unnecessary dependency: 'toast'. Either exclude it or remove the dependency array. Outer scope values like 'toast' aren't valid dependencies because mutating them doesn't re-render the component.  react-hooks/exhaustive-deps
131:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./components/worker-recent-tasks.tsx
96:9  Warning: 'getStatusText' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./lib/auth.ts
1:10  Warning: 'NextResponse' is defined but never used.  @typescript-eslint/no-unused-vars

./lib/jwt.ts
12:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
53:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
66:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./lib/prismaClientExtension.ts
2:10  Warning: 'Prisma' is defined but never used.  @typescript-eslint/no-unused-vars

./lib/session.ts
6:11  Warning: 'DecodedToken' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/auth.ts
1:10  Warning: 'NextResponse' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/jwt.ts
12:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
53:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
66:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/prismaClientExtension.ts
2:10  Warning: 'Prisma' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/session.ts
6:11  Warning: 'DecodedToken' is defined but never used.  @typescript-eslint/no-unused-vars

./src/modules/auth/auth-provider.tsx
39:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
196:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/billing/components/billing-period-form.tsx
106:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/billing/components/distribute-bill-dialog.tsx
69:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/billing/components/new-period-form.tsx
96:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/billing/components/periods-table.tsx
24:29  Warning: 'Well' is defined but never used.  @typescript-eslint/no-unused-vars
77:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/billing/components/record-payment-dialog.tsx
140:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
151:12  Warning: 'ownerId' is defined but never used.  @typescript-eslint/no-unused-vars

./src/modules/billing/components/well-bill-form.tsx
175:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/equipment/components/equipment-form.tsx
73:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
145:9  Warning: 'removeOwnership' is assigned a value but never used.  @typescript-eslint/no-unused-vars
192:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/equipment/components/equipment-table.tsx
80:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
81:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
98:6  Warning: React Hook useEffect has missing dependencies: 'fetchEquipment' and 'fetchOwners'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
117:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
210:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/irrigation/components/irrigation-form.tsx
3:40  Warning: 'useCallback' is defined but never used.  @typescript-eslint/no-unused-vars
10:59  Warning: 'UserIcon' is defined but never used.  @typescript-eslint/no-unused-vars
249:6  Warning: React Hook useEffect has a missing dependency: 'form'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
279:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
295:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
312:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
320:6  Warning: React Hook useEffect has a missing dependency: 'isEditMode'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
364:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
377:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
412:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
512:52  Warning: 'owners' is defined but never used.  @typescript-eslint/no-unused-vars
513:55  Warning: 'userName' is defined but never used.  @typescript-eslint/no-unused-vars
531:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
642:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
802:53  Warning: 'userName' is defined but never used.  @typescript-eslint/no-unused-vars
821:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
846:9  Warning: 'getOwnerShareForGroup' is assigned a value but never used.  @typescript-eslint/no-unused-vars
985:89  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
985:111  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/modules/irrigation/components/irrigation-list.tsx
3:20  Warning: 'useEffect' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'Filter' is defined but never used.  @typescript-eslint/no-unused-vars
105:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
178:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
182:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
278:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
302:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
326:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
436:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/modules/irrigation/components/irrigation-stats.tsx
121:6  Warning: React Hook useEffect has missing dependencies: 'fetchFields' and 'fetchSeasons'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
125:6  Warning: React Hook useEffect has a missing dependency: 'fetchStats'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
266:15  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
288:15  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control
310:15  Warning: A form label must be associated with a control.  jsx-a11y/label-has-associated-control

./src/shared/components/dashboard/dashboard-stats.tsx
31:3  Warning: 'icon' is defined but never used.  @typescript-eslint/no-unused-vars

./src/shared/components/dashboard/recent-activity.tsx
117:37  Warning: 'index' is defined but never used.  @typescript-eslint/no-unused-vars

./src/shared/components/ui/alert.tsx
39:3  Warning: Headings must have content and the content must be accessible by a screen reader.  jsx-a11y/heading-has-content    

./src/shared/components/ui/calendar.tsx
4:10  Warning: 'ChevronLeftIcon' is defined but never used.  @typescript-eslint/no-unused-vars
4:27  Warning: 'ChevronRightIcon' is defined but never used.  @typescript-eslint/no-unused-vars

./src/shared/components/ui/chart.tsx
72:7  Warning: '_' is defined but never used.  @typescript-eslint/no-unused-vars

./src/shared/components/ui/command.tsx
42:52  Warning: Unknown property 'cmdk-input-wrapper' found  react/no-unknown-property

./src/shared/components/ui/pagination.tsx
48:3  Warning: Anchors must have content and the content must be accessible by a screen reader.  jsx-a11y/anchor-has-content      

./src/shared/components/ui/sidebar.tsx
25:7  Warning: 'SIDEBAR_WIDTH' is assigned a value but never used.  @typescript-eslint/no-unused-vars
27:7  Warning: 'SIDEBAR_WIDTH_ICON' is assigned a value but never used.  @typescript-eslint/no-unused-vars
65:7  Warning: 'style' is defined but never used.  @typescript-eslint/no-unused-vars

./src/shared/components/ui/use-toast.ts
20:7  Warning: 'actionTypes' is assigned a value but only used as a type.  @typescript-eslint/no-unused-vars