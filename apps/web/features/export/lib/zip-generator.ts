import archiver from "archiver"
import { Readable } from "stream"

export interface ZipFile {
  name: string
  content: Buffer | string
  folder?: string
}

export interface ZipGeneratorResult {
  buffer: Buffer
  size: number
}

export async function generateZip(files: ZipFile[]): Promise<ZipGeneratorResult> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    })

    const chunks: Buffer[] = []
    let totalSize = 0

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
      totalSize += chunk.length
    })

    archive.on("end", () => {
      const buffer = Buffer.concat(chunks)
      resolve({ buffer, size: buffer.length })
    })

    archive.on("error", (err) => {
      reject(err)
    })

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("Archive warning:", err)
      } else {
        reject(err)
      }
    })

    // Add files to archive
    for (const file of files) {
      const filePath = file.folder ? `${file.folder}/${file.name}` : file.name

      if (Buffer.isBuffer(file.content)) {
        archive.append(file.content, { name: filePath })
      } else {
        archive.append(file.content, { name: filePath })
      }
    }

    // Finalize the archive
    archive.finalize()
  })
}

export async function generateZipFromStreams(
  files: Array<{
    name: string
    stream: Readable
    folder?: string
  }>,
  bufferFiles: ZipFile[]
): Promise<ZipGeneratorResult> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Balance between speed and compression
    })

    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })

    archive.on("end", () => {
      const buffer = Buffer.concat(chunks)
      resolve({ buffer, size: buffer.length })
    })

    archive.on("error", (err) => {
      reject(err)
    })

    // Add buffer files (CSV, PDF)
    for (const file of bufferFiles) {
      const filePath = file.folder ? `${file.folder}/${file.name}` : file.name
      archive.append(file.content, { name: filePath })
    }

    // Add stream files (invoices from R2)
    for (const file of files) {
      const filePath = file.folder ? `${file.folder}/${file.name}` : file.name
      archive.append(file.stream, { name: filePath })
    }

    archive.finalize()
  })
}
