import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const root = process.cwd();
const modelPath = path.join(
  root,
  "public",
  "assets",
  "releases",
  "tvar-zhret-tvar",
  "envelope.glb",
);
const outputDirectory = path.join(root, "UV_TEMPLATES", "tvar-zhret-tvar");
const canvasSize = 4096;
const meshes = ["body", "valve", "paper"];

const modelBuffer = await fs.readFile(modelPath);
const arrayBuffer = modelBuffer.buffer.slice(
  modelBuffer.byteOffset,
  modelBuffer.byteOffset + modelBuffer.byteLength,
);
const gltf = await new Promise((resolve, reject) => {
  new GLTFLoader().parse(arrayBuffer, "", resolve, reject);
});

await fs.mkdir(outputDirectory, { recursive: true });

function uvPoint(attribute, index) {
  return {
    x: attribute.getX(index),
    y: attribute.getY(index),
  };
}

function pointKey(point) {
  return `${point.x.toFixed(7)},${point.y.toFixed(7)}`;
}

function edgeKey(a, b) {
  const aKey = pointKey(a);
  const bKey = pointKey(b);
  return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
}

function addEdge(edges, a, b) {
  const key = edgeKey(a, b);
  const existing = edges.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    edges.set(key, { a, b, count: 1 });
  }
}

function svgLine(edge) {
  const x1 = edge.a.x * canvasSize;
  const y1 = (1 - edge.a.y) * canvasSize;
  const x2 = edge.b.x * canvasSize;
  const y2 = (1 - edge.b.y) * canvasSize;
  return `<path d="M ${x1.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y2.toFixed(3)}" />`;
}

function svgDocument(name, edges) {
  const internal = [...edges.values()].filter((edge) => edge.count > 1).map(svgLine).join("\n");
  const boundaries = [...edges.values()].filter((edge) => edge.count === 1).map(svgLine).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" fill="none" data-mesh="${name}">
  <g stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
    ${internal}
  </g>
  <g stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    ${internal}
  </g>
  <g stroke="#000" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
    ${boundaries}
  </g>
  <g stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    ${boundaries}
  </g>
  <rect x="5" y="5" width="4086" height="4086" stroke="#000" stroke-width="10" />
  <rect x="7" y="7" width="4082" height="4082" stroke="#fff" stroke-width="3" />
</svg>
`;
}

function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function convexHull(points) {
  const unique = [...new Map(points.map((point) => [`${point.x.toFixed(7)},${point.y.toFixed(7)}`, point])).values()]
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (unique.length <= 2) return unique;

  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (const point of [...unique].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function artworkDocument(name, geometry) {
  const position = geometry.getAttribute("position");
  const points = [];
  for (let index = 0; index < position.count; index += 1) {
    points.push({ x: position.getX(index), y: position.getZ(index) });
  }

  const hull = convexHull(points);
  const xMin = Math.min(...hull.map((point) => point.x));
  const xMax = Math.max(...hull.map((point) => point.x));
  const yMin = Math.min(...hull.map((point) => point.y));
  const yMax = Math.max(...hull.map((point) => point.y));
  const modelWidth = xMax - xMin;
  const modelHeight = yMax - yMin;
  const aspect = modelWidth / modelHeight;
  const width = aspect >= 1 ? canvasSize : Math.max(1, Math.round(canvasSize * aspect));
  const height = aspect >= 1 ? Math.max(1, Math.round(canvasSize / aspect)) : canvasSize;
  const pathData = hull
    .map((point, index) => {
      const x = ((point.x - xMin) / modelWidth) * width;
      const y = (1 - (point.y - yMin) / modelHeight) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`;
    })
    .join(" ");

  return {
    width,
    height,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" data-mesh="${name}" data-template="planar-artwork">
  <path d="${pathData} Z" stroke="#000" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
  <path d="${pathData} Z" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`,
  };
}

const manifest = [];

for (const meshName of meshes) {
  const mesh = gltf.scene.getObjectByName(meshName);
  if (!mesh?.geometry) throw new Error(`Mesh not found: ${meshName}`);

  const uv = mesh.geometry.getAttribute("uv");
  const position = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.index;
  if (!uv || !position) throw new Error(`Mesh has no UV data: ${meshName}`);

  const edges = new Map();
  const triangleCount = index ? index.count / 3 : position.count / 3;
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const base = triangle * 3;
    const indices = index
      ? [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
      : [base, base + 1, base + 2];
    const [a, b, c] = indices.map((vertexIndex) => uvPoint(uv, vertexIndex));
    addEdge(edges, a, b);
    addEdge(edges, b, c);
    addEdge(edges, c, a);
  }

  const values = [...edges.values()];
  const uValues = values.flatMap((edge) => [edge.a.x, edge.b.x]);
  const vValues = values.flatMap((edge) => [edge.a.y, edge.b.y]);
  const svg = svgDocument(meshName, edges);
  const artwork = artworkDocument(meshName, mesh.geometry);
  const svgName = `${meshName}_uv.svg`;
  const pngName = `${meshName}_uv_4096.png`;
  const artworkSvgName = `${meshName}_artwork_template.svg`;
  const artworkPngName = `${meshName}_artwork_template.png`;

  await fs.writeFile(path.join(outputDirectory, svgName), svg, "utf8");
  await sharp(Buffer.from(svg)).png().toFile(path.join(outputDirectory, pngName));
  await fs.writeFile(path.join(outputDirectory, artworkSvgName), artwork.svg, "utf8");
  await sharp(Buffer.from(artwork.svg)).png().toFile(path.join(outputDirectory, artworkPngName));

  manifest.push({
    mesh: meshName,
    triangles: triangleCount,
    uvBounds: {
      uMin: Math.min(...uValues),
      uMax: Math.max(...uValues),
      vMin: Math.min(...vValues),
      vMax: Math.max(...vValues),
    },
    svg: svgName,
    png: pngName,
    artworkTemplate: {
      width: artwork.width,
      height: artwork.height,
      svg: artworkSvgName,
      png: artworkPngName,
    },
  });
}

await fs.writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify({ canvasSize, model: path.relative(root, modelPath), templates: manifest }, null, 2)}\n`,
  "utf8",
);

console.log(`UV templates exported to ${outputDirectory}`);
