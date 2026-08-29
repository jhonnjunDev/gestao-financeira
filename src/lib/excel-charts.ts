import JSZip from "jszip";

// Injeção de gráficos nativos do Excel (editáveis) via manipulação do XML do XLSX.
// O ExcelJS padrão não suporta addChart, então inserimos os parts de chart/drawing
// diretamente no pacote OOXML usando JSZip.

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartConfig {
  id: number;
  type: "bar" | "line" | "pie";
  title: string;
  categories: string[];
  series: ChartSeries[];
  dataSheet: string; // nome da planilha com os dados
  catStartRow: number; // linha inicial das categorias (1-based)
  catStartCol: number; // coluna das categorias (A=1)
  serStartCol: number; // coluna inicial das séries (A=1)
  pos: { x: number; y: number; cx: number; cy: number }; // EMU
}

const XMLNS = {
  c: "http://schemas.openxmlformats.org/drawingml/2006/chart",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  xdr: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
};

const CAT_COLORS = ["2563EB", "10B981", "F59E0B", "EF4444", "8B5CF6", "06B6D4", "F97316", "84CC16", "EC4899", "6366F1", "14B8A6", "A855F7"];

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sheetRef(sheet: string): string {
  // Se o nome tem espaços/caracteres especiais, usar aspas simples
  return /^[A-Za-z0-9_]+$/.test(sheet) ? sheet : `'${sheet}'`;
}

function numCache(values: number[]): string {
  const pts = values
    .map((v, i) => `<c:pt idx="${i}"><c:v>${Math.round(v * 100) / 100}</c:v></c:pt>`)
    .join("");
  return `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${pts}</c:numCache>`;
}

function strCache(values: string[]): string {
  const pts = values
    .map((v, i) => `<c:pt idx="${i}"><c:v>${escapeXml(v)}</c:v></c:pt>`)
    .join("");
  return `<c:strCache><c:ptCount val="${values.length}"/>${pts}</c:strCache>`;
}

function chartTitleXml(title: string): string {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1300" b="1"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:r><a:rPr lang="pt-BR" sz="1300" b="1"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${escapeXml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
}

function legendXml(): string {
  return `<c:legend><c:legendPos val="b"/><c:overlay val="0"/><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr></c:legend>`;
}

function categoryRef(cfg: ChartConfig): string {
  const sheet = sheetRef(cfg.dataSheet);
  const col = colLetter(cfg.catStartCol);
  return `${sheet}!${col}${cfg.catStartRow}:${col}${cfg.catStartRow + cfg.categories.length - 1}`;
}

function seriesRef(cfg: ChartConfig, idx: number): string {
  const sheet = sheetRef(cfg.dataSheet);
  const col = colLetter(cfg.serStartCol + idx);
  return `${sheet}!${col}${cfg.catStartRow}:${col}${cfg.catStartRow + cfg.categories.length - 1}`;
}

function nameRef(cfg: ChartConfig, idx: number): string {
  const sheet = sheetRef(cfg.dataSheet);
  const col = colLetter(cfg.serStartCol + idx);
  return `${sheet}!${col}${cfg.catStartRow - 1}`;
}

function barChartXml(cfg: ChartConfig): string {
  const series = cfg.series
    .map((s, i) => {
      const color = CAT_COLORS[i % CAT_COLORS.length];
      return `<c:ser>
        <c:idx val="${i}"/>
        <c:order val="${i}"/>
        <c:tx><c:strRef><c:f>${nameRef(cfg, i)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(s.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>
        <c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>
        <c:cat><c:strRef><c:f>${categoryRef(cfg)}</c:f>${strCache(cfg.categories)}</c:strRef></c:cat>
        <c:val><c:numRef><c:f>${seriesRef(cfg, i)}</c:f>${numCache(s.values)}</c:numRef></c:val>
      </c:ser>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${XMLNS.c}" xmlns:a="${XMLNS.a}" xmlns:r="${XMLNS.r}">
  <c:date1904 val="0"/>
  <c:lang val="pt-BR"/>
  <c:roundedCorners val="0"/>
  <c:style val="2"/>
  <c:chart>
    ${chartTitleXml(cfg.title)}
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        ${series}
        <c:axId val="1001"/>
        <c:axId val="1002"/>
      </c:barChart>
      <c:valAx>
        <c:axId val="1001"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:numFmt formatCode="#,##0" sourceLinked="0"/>
        <c:majorGridlines/>
        <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
        <c:crossAx val="1002"/>
        <c:crosses val="autoZero"/>
        <c:autoDeleted val="0"/>
      </c:valAx>
      <c:catAx>
        <c:axId val="1002"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:crossAx val="1001"/>
        <c:crosses val="autoZero"/>
        <c:autoDeleted val="0"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
      </c:catAx>
    </c:plotArea>
    ${legendXml()}
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
</c:chartSpace>`;
}

function lineChartXml(cfg: ChartConfig): string {
  const series = cfg.series
    .map((s, i) => {
      const color = CAT_COLORS[i % CAT_COLORS.length];
      return `<c:ser>
        <c:idx val="${i}"/>
        <c:order val="${i}"/>
        <c:tx><c:strRef><c:f>${nameRef(cfg, i)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(s.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>
        <c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr>
        <c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr></c:marker>
        <c:cat><c:strRef><c:f>${categoryRef(cfg)}</c:f>${strCache(cfg.categories)}</c:strRef></c:cat>
        <c:val><c:numRef><c:f>${seriesRef(cfg, i)}</c:f>${numCache(s.values)}</c:numRef></c:val>
        <c:smooth val="0"/>
      </c:ser>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${XMLNS.c}" xmlns:a="${XMLNS.a}" xmlns:r="${XMLNS.r}">
  <c:date1904 val="0"/>
  <c:lang val="pt-BR"/>
  <c:roundedCorners val="0"/>
  <c:style val="2"/>
  <c:chart>
    ${chartTitleXml(cfg.title)}
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:lineChart>
        <c:grouping val="standard"/>
        <c:varyColors val="0"/>
        ${series}
        <c:marker val="1"/>
        <c:axId val="2001"/>
        <c:axId val="2002"/>
      </c:lineChart>
      <c:valAx>
        <c:axId val="2001"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:numFmt formatCode="#,##0" sourceLinked="0"/>
        <c:majorGridlines/>
        <c:crossAx val="2002"/>
        <c:crosses val="autoZero"/>
        <c:autoDeleted val="0"/>
      </c:valAx>
      <c:catAx>
        <c:axId val="2002"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:crossAx val="2001"/>
        <c:crosses val="autoZero"/>
        <c:autoDeleted val="0"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
      </c:catAx>
    </c:plotArea>
    ${legendXml()}
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
</c:chartSpace>`;
}

function pieChartXml(cfg: ChartConfig): string {
  const series = cfg.series
    .map((s, i) => {
      const cats = cfg.categories.map((cat, j) => `<c:pt idx="${j}"><c:v>${escapeXml(cat)}</c:v></c:pt>`).join("");
      const vals = s.values.map((v, j) => `<c:pt idx="${j}"><c:v>${Math.round(v * 100) / 100}</c:v></c:pt>`).join("");
      return `<c:ser>
        <c:idx val="${i}"/>
        <c:order val="${i}"/>
        <c:tx><c:strRef><c:f>${nameRef(cfg, i)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(s.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>
        <c:dPt>
          <c:idx val="0"/>
        </c:dPt>
        <c:cat><c:strRef><c:f>${categoryRef(cfg)}</c:f><c:strCache><c:ptCount val="${cfg.categories.length}"/>${cats}</c:strCache></c:strRef></c:cat>
        <c:val><c:numRef><c:f>${seriesRef(cfg, i)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${s.values.length}"/>${vals}</c:numCache></c:numRef></c:val>
      </c:ser>`;
    })
    .join("");

  // Cores por ponto
  const dPts = cfg.categories
    .map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${CAT_COLORS[i % CAT_COLORS.length]}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${XMLNS.c}" xmlns:a="${XMLNS.a}" xmlns:r="${XMLNS.r}">
  <c:date1904 val="0"/>
  <c:lang val="pt-BR"/>
  <c:roundedCorners val="0"/>
  <c:style val="2"/>
  <c:chart>
    ${chartTitleXml(cfg.title)}
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:pieChart>
        <c:varyColors val="1"/>
        ${series}
        ${dPts}
        <c:firstSliceAng val="0"/>
      </c:pieChart>
    </c:plotArea>
    ${legendXml()}
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
</c:chartSpace>`;
}

function drawingXml(chartIds: { id: number; rId: string; pos: { x: number; y: number; cx: number; cy: number } }[]): string {
  const frames = chartIds
    .map((c) => {
      const id = c.id + 2;
      return `<xdr:absoluteAnchor>
        <xdr:pos x="${c.pos.x}" y="${c.pos.y}"/>
        <xdr:ext cx="${c.pos.cx}" cy="${c.pos.cy}"/>
        <xdr:graphicFrame macro="">
          <xdr:nvGraphicFramePr>
            <xdr:cNvPr id="${id}" name="Chart ${c.id}"/>
            <xdr:cNvGraphicFramePr/>
          </xdr:nvGraphicFramePr>
          <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
          <a:graphic>
            <a:graphicData uri="${XMLNS.c}">
              <c:chart xmlns:c="${XMLNS.c}" xmlns:r="${XMLNS.r}" r:id="${c.rId}"/>
            </a:graphicData>
          </a:graphic>
        </xdr:graphicFrame>
        <xdr:clientData/>
      </xdr:absoluteAnchor>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="${XMLNS.xdr}" xmlns:a="${XMLNS.a}">
  ${frames}
</xdr:wsDr>`;
}

function drawingRels(chartIds: { rId: string; chartFile: string }[]): string {
  const rels = chartIds
    .map((c) => `<Relationship Id="${c.rId}" Type="${XMLNS.r}/chart" Target="../charts/${c.chartFile}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

export async function injectCharts(buffer: Buffer, charts: ChartConfig[]): Promise<Buffer> {
  if (charts.length === 0) return buffer;

  const zip = await JSZip.loadAsync(buffer);
  const chartParts = new Map<string, { xml: string; rId: string }>();

  charts.forEach((cfg, i) => {
    const chartFile = `chart${i + 1}.xml`;
    const rId = `rId${i + 1}`;
    let xml = "";
    if (cfg.type === "line") xml = lineChartXml(cfg);
    else if (cfg.type === "pie") xml = pieChartXml(cfg);
    else xml = barChartXml(cfg);
    chartParts.set(chartFile, { xml, rId });
    zip.file(`xl/charts/${chartFile}`, xml);
  });

  // Drawing que posiciona todos os gráficos na aba 1
  const drawingFile = "drawing1.xml";
  const drawingRelsFile = "xl/drawings/_rels/drawing1.xml.rels";
  const drawing = drawingXml(charts.map((cfg, i) => ({
    id: cfg.id,
    rId: chartParts.get(`chart${i + 1}.xml`)!.rId,
    pos: cfg.pos,
  })));
  zip.file(`xl/drawings/${drawingFile}`, drawing);
  zip.file(
    drawingRelsFile,
    drawingRels(charts.map((cfg, i) => ({
      rId: chartParts.get(`chart${i + 1}.xml`)!.rId,
      chartFile: `chart${i + 1}.xml`,
    })))
  );

  // Atualizar [Content_Types].xml
  const ctPath = "[Content_Types].xml";
  let ct = await zip.file(ctPath)?.async("string");
  if (ct) {
    if (!ct.includes("xl/drawings/" + drawingFile)) {
      ct = ct.replace(
        "</Types>",
        `<Override PartName="/xl/drawings/${drawingFile}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`
      );
    }
    // Adicionar overrides para todos os charts
    const existingCharts = [...ct.matchAll(/PartName="\/xl\/charts\/chart\d+\.xml"/g)].length;
    if (charts.length > existingCharts) {
      for (let i = existingCharts + 1; i <= charts.length; i++) {
        if (!ct.includes(`/xl/charts/chart${i}.xml`)) {
          ct = ct.replace(
            "</Types>",
            `<Override PartName="/xl/charts/chart${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`
          );
        }
      }
    }
    zip.file(ctPath, ct);
  }

  // Adicionar relação drawing na planilha 1 (Dashboard Executivo é a primeira)
  const sheetRelPath = "xl/worksheets/_rels/sheet1.xml.rels";
  let sheetRels = await zip.file(sheetRelPath)?.async("string");
  if (!sheetRels) {
    sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  }
  if (!sheetRels.includes("drawing1.xml")) {
    const nextId = Math.max(
      0,
      ...[...sheetRels.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10))
    ) + 1;
    sheetRels = sheetRels.replace(
      "</Relationships>",
      `<Relationship Id="rId${nextId}" Type="${XMLNS.r}/drawing" Target="../drawings/${drawingFile}"/></Relationships>`
    );
    zip.file(sheetRelPath, sheetRels);
  }

  // Inserir <drawing r:id=.../> no fim da planilha 1 (antes de </worksheet>)
  const sheetPath = "xl/worksheets/sheet1.xml";
  let sheetXml = await zip.file(sheetPath)?.async("string");
  if (sheetXml && !sheetXml.includes("<drawing ")) {
    const nextId = Math.max(
      0,
      ...[...sheetRels!.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10))
    );
    const drawingRelId = `rId${nextId}`;
    sheetXml = sheetXml.replace(
      "</worksheet>",
      `<drawing r:id="${drawingRelId}"/></worksheet>`
    );
    zip.file(sheetPath, sheetXml);
  }

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return Buffer.from(out);
}

// Posições padrão dos gráficos (EMU). 1 polegada = 914400 EMU.
export const CHART_POS = {
  big: { x: 200000, y: 250000, cx: 5500000, cy: 3000000 },
  right: { x: 5800000, y: 250000, cx: 4000000, cy: 3000000 },
  smallLeft: { x: 200000, y: 3500000, cx: 4200000, cy: 2800000 },
  smallRight: { x: 4600000, y: 3500000, cx: 4200000, cy: 2800000 },
};