import { useState } from 'react';
import {
  Boxes,
  ChartNoAxesCombined,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Shell, Sidebar, SidebarBrand, SidebarNav, SidebarNavGroup, SidebarNavItem, SidebarFooter, SidebarAccount, ShellMain, ShellContent } from '@/components/ui/sidebar';
import { Topbar } from '@/components/ui/topbar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { VersionTag } from '@/components/ui/version-tag';
import { ScoreBadge } from '@/components/ui/score-badge';
import { ToleranceBar } from '@/components/ui/tolerance-bar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Stepper } from '@/components/ui/stepper';
import { ChatThread, ChatBubble, ChatComposer } from '@/components/ui/chat';
import { EmptyState } from '@/components/ui/empty-state';
import { OfferCard } from '@/components/ui/offer-card';
import { ComparisonBar } from '@/components/ui/comparison-bar';
import { FilterChips } from '@/components/ui/filter-chips';
import { AiExplanation } from '@/components/ui/ai-explanation';
import { ErrorMessage } from '@/components/ui/error-message';

/**
 * Referencia viva de la librería de componentes (estilo shadcn/ui) para
 * AgroMatch. No es una pantalla del producto: es el catálogo que los 4 devs
 * usan para armar sus pantallas (ver docs/pantallas.md) sin reinventar estilos.
 */
export function UiKitPreview() {
  const [message, setMessage] = useState('');
  const [tierFilter, setTierFilter] = useState<string[]>(['elite']);

  return (
    <Shell>
      <Sidebar>
        <SidebarBrand mark="A" name="AgroMatch" subtitle="Librería de componentes" />
        <SidebarNav>
          <SidebarNavGroup label="Catálogo">
            <SidebarNavItem icon={<LayoutDashboard />} active>
              Componentes base
            </SidebarNavItem>
            <SidebarNavItem icon={<ChartNoAxesCombined />} version="v2">
              Motor genético
            </SidebarNavItem>
            <SidebarNavItem icon={<Handshake />}>Negociación</SidebarNavItem>
            <SidebarNavItem icon={<MessageSquare />}>Chat</SidebarNavItem>
            <SidebarNavItem icon={<Boxes />}>Marketplace</SidebarNavItem>
          </SidebarNavGroup>
        </SidebarNav>
        <SidebarFooter>
          <SidebarAccount
            avatar={<Avatar size="sm"><AvatarFallback>JB</AvatarFallback></Avatar>}
            name="Joaquín Benegas"
            meta="Productor · Cabaña"
          />
        </SidebarFooter>
      </Sidebar>

      <ShellMain>
        <Topbar>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Librería</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Catálogo de componentes</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Avatar size="sm">
            <AvatarFallback>JB</AvatarFallback>
          </Avatar>
        </Topbar>

        <ShellContent>
          <PageHeader
            title="Librería de componentes AgroMatch"
            description="Base para las pantallas del MVP (docs/pantallas.md): primitivas al estilo shadcn/ui + los 9 componentes compartidos que arma D1 (tarjeta de oferta, barra comparativa, chips de filtro, explicación IA, mensaje de error, y más)."
            actions={
              <Button onClick={() => toast.success('Toast funcionando correctamente')}>
                <Sparkles /> Probar toast
              </Button>
            }
          />

          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Matches activos" value="12" meta="+3 esta semana" />
            <StatCard label="Score promedio" value="87" meta="Sobre 100" />
            <StatCard label="Tratos cerrados" value="4" meta="Último: hoy" />
            <StatCard label="Verificaciones" value="9/10" meta="1 pendiente" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Badges y estados</CardTitle>
              <CardDescription>Insignias determinísticas: nunca las redacta la IA.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Badge variant="ok">Cobertura OK</Badge>
              <Badge variant="solid">CDCB 2.4</Badge>
              <Badge variant="warn">Revisar disponibilidad</Badge>
              <Badge variant="danger">Sin stock</Badge>
              <Badge variant="neutral">Borrador</Badge>
              <VersionTag>v2</VersionTag>
              <ScoreBadge tier="hi" score={92} />
              <ScoreBadge tier="mid" score={61} />
              <ScoreBadge tier="lo" score={24} />
              <VerificationBadge status="verified" />
              <VerificationBadge status="pending" />
              <VerificationBadge status="unverified" />
            </CardContent>
            <CardContent className="flex flex-col gap-2 border-t border-border-soft pt-4">
              <span className="text-[11px] text-muted-foreground">Barra de tolerancia (con límite marcado)</span>
              <ToleranceBar value={68} limit={80} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Componentes del flujo necesidad / swipe</CardTitle>
              <CardDescription>
                TarjetaOferta, BarraComparativa, ChipsFiltro, ExplicacionIA y MensajeError — los 5 que
                faltaban de los 9 compartidos que arma D1.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FilterChips
                chips={[
                  { value: 'elite', label: 'Élite', count: 73 },
                  { value: 'comercial', label: 'Comercial', count: 132 },
                  { value: 'carne', label: 'Carne', count: 86 },
                  { value: 'alerta', label: 'Alerta', count: 2 },
                ]}
                value={tierFilter}
                onValueChange={setTierFilter}
              />

              <div className="grid grid-cols-2 gap-4">
                <OfferCard
                  title="Toro 4412 · Angus"
                  subtitle="Cabaña La Esperanza · Río Cuarto"
                  rank={{ position: 1, total: 12 }}
                  badges={<VerificationBadge status="verified" />}
                  stats={[
                    { label: 'DEP destete', value: '+14' },
                    { label: 'Consanguinidad', value: '1,2%' },
                  ]}
                  price="US$ 16 /dosis"
                  explanation={
                    <AiExplanation
                      source="AI"
                      text="Lidera el ranking porque su DEP de destete (+14) supera al resto del catálogo y su consanguinidad (1,2%) está muy por debajo del límite (6%)."
                    />
                  }
                  secondaryAction={<Button variant="ghost">Pasar</Button>}
                  primaryAction={<Button className="flex-1">Elegir</Button>}
                />

                <div className="flex flex-col gap-3">
                  <ComparisonBar
                    label="SCS (menos es mejor)"
                    from={3.19}
                    to={2.95}
                    min={2}
                    max={4}
                    direction="lower-is-better"
                    format={(v) => v.toFixed(2)}
                  />
                  <ComparisonBar
                    label="PRO"
                    from={24}
                    to={29}
                    min={0}
                    max={40}
                    direction="higher-is-better"
                  />
                  <ErrorMessage message="El servidor de matching no respondió (504). Reintentá en unos segundos." />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Publicar requerimiento</CardTitle>
                <CardDescription>Formulario con Field + Input/Textarea/Select</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Field label="Qué necesitás" required>
                  <Textarea placeholder="Ej: necesito quien me are 40 ha en Río Cuarto…" rows={3} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ubicación">
                    <Input defaultValue="Río Cuarto, Córdoba" />
                  </Field>
                  <Field label="Tipo de servicio">
                    <Select defaultValue="labranza">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labranza">Labranza</SelectItem>
                        <SelectItem value="veterinario">Veterinario</SelectItem>
                        <SelectItem value="genetica">Genética</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="urgente" />
                  <label htmlFor="urgente" className="text-[12.5px]">Marcar como urgente</label>
                </div>
                <RadioGroup defaultValue="abierto" className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="abierto" id="r1" />
                    <label htmlFor="r1" className="text-[12.5px]">Abierto al mercado</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="dirigido" id="r2" />
                    <label htmlFor="r2" className="text-[12.5px]">Dirigido</label>
                  </div>
                </RadioGroup>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px]">Notificarme por email</span>
                  <Switch defaultChecked />
                </div>
                <Button className="self-start">Publicar requerimiento</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overlays</CardTitle>
                <CardDescription>Dialog, DropdownMenu, Popover, Tooltip</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Abrir modal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar publicación</DialogTitle>
                      <DialogDescription>
                        El requerimiento llega a los proveedores que el motor identifica como aptos.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button>Confirmar</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">Acciones ▾</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Duplicar</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost">Ver detalle</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <p className="text-[12.5px]">Popover con contenido libre, útil para filtros rápidos.</p>
                  </PopoverContent>
                </Popover>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost">Hover para tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>Explicación breve del control</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tabs, tabla y progreso</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Tabs defaultValue="matriz">
                <TabsList>
                  <TabsTrigger value="matriz">Matriz</TabsTrigger>
                  <TabsTrigger value="comparador">Comparador</TabsTrigger>
                </TabsList>
                <TabsContent value="matriz">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Toro</TableHead>
                        <TableHead className="num">CDCB</TableHead>
                        <TableHead className="num">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Reproductor 118</TableCell>
                        <TableCell className="num">2.41</TableCell>
                        <TableCell className="num"><ScoreBadge tier="hi" score={92} /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Reproductor 204</TableCell>
                        <TableCell className="num">1.98</TableCell>
                        <TableCell className="num"><ScoreBadge tier="mid" score={58} /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="comparador">
                  <EmptyState
                    title="Sin toros para comparar"
                    description="Agregá al menos dos reproductores desde la ficha técnica."
                    action={<Button size="sm" variant="secondary">Agregar reproductor</Button>}
                  />
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-muted-foreground">Progreso de verificación</span>
                  <Progress value={65} />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-muted-foreground">Rango de tolerancia (slider)</span>
                  <Slider defaultValue={[30, 70]} />
                </div>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="a1">
                  <AccordionTrigger>¿Cómo se calcula el ranking?</AccordionTrigger>
                  <AccordionContent>
                    Filtros duros → score → ranking. La IA solo redacta la explicación a partir de esos hechos.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Alert variant="warning">
                <AlertTitle>Proveedor no verificado</AlertTitle>
                <AlertDescription>
                  Este proveedor todavía no completó la verificación. Se muestra igual, pero identificado.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Stepper de onboarding</CardTitle>
              </CardHeader>
              <CardContent>
                <Stepper
                  current={1}
                  steps={[
                    { label: 'Datos del establecimiento' },
                    { label: 'Verificación' },
                    { label: 'Preferencias de matching' },
                  ]}
                />
              </CardContent>
            </Card>

            <Card className={cn('flex flex-col overflow-hidden p-0')}>
              <CardHeader>
                <CardTitle>Chat transaccional</CardTitle>
              </CardHeader>
              <ChatThread className="max-h-40">
                <ChatBubble author="Proveedor" timestamp="10:02">
                  Hola, puedo cubrir las 40 ha la semana que viene.
                </ChatBubble>
                <ChatBubble align="end" timestamp="10:04">
                  Perfecto, ¿cuál sería el costo por hectárea?
                </ChatBubble>
              </ChatThread>
              <ChatComposer
                value={message}
                onValueChange={setMessage}
                onSend={() => {
                  toast.message('Mensaje enviado (demo)');
                  setMessage('');
                }}
              />
            </Card>
          </div>

          <Separator />
          <p className="text-[11px] text-ink-4">
            Todos los componentes viven en <code>src/components/ui</code>, uno por archivo, importables como
            <code> @/components/ui/&lt;nombre&gt;</code>.
          </p>
        </ShellContent>
      </ShellMain>
    </Shell>
  );
}

export default UiKitPreview;
