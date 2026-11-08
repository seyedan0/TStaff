import { Injectable } from "@nestjs/common";
import { Socket } from "node:net";
import type { VirusScanResult, VirusScannerPort } from "../application/ports/files.ports.js";

@Injectable()
export class ClamAvVirusScanner implements VirusScannerPort {
  scan(contents: Buffer): Promise<VirusScanResult> {
    const host = process.env.CLAMAV_HOST ?? "127.0.0.1";
    const port = Number(process.env.CLAMAV_PORT ?? 3310);
    return new Promise((resolveResult) => {
      const socket = new Socket();
      let response = "";
      let settled = false;
      const finish = (result: VirusScanResult) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolveResult(result);
      };
      socket.setTimeout(15000, () => finish("UNAVAILABLE"));
      socket.on("error", () => finish("UNAVAILABLE"));
      socket.on("data", (chunk) => {
        response += chunk.toString("utf8");
        if (response.includes("FOUND")) finish("INFECTED");
        else if (response.includes("OK")) finish("CLEAN");
      });
      socket.on("end", () => finish(response.includes("OK") ? "CLEAN" : response.includes("FOUND") ? "INFECTED" : "UNAVAILABLE"));
      socket.connect(port, host, () => {
        socket.write(Buffer.concat([Buffer.from("zINSTREAM"), Buffer.from([0])]));
        for (let offset = 0; offset < contents.length; offset += 64 * 1024) {
          const chunk = contents.subarray(offset, Math.min(offset + 64 * 1024, contents.length));
          const length = Buffer.alloc(4);
          length.writeUInt32BE(chunk.length);
          socket.write(length);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      });
    });
  }
}
