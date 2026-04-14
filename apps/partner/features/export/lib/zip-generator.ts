import archiver from "archiver"

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
    const archive = archiver("zip", { zlib: { level: 9 } })

    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => {
      const buffer = Buffer.concat(chunks)
      resolve({ buffer, size: buffer.length })
    })
    archive.on("error", reject)
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err)
    })

    for (const file of files) {
      const filePath = file.folder ? `${file.folder}/${file.name}` : file.name
      archive.append(file.content, { name: filePath })
    }

    archive.finalize()
  })
}
