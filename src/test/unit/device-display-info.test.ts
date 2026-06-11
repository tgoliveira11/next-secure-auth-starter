import { describe, it, expect } from "vitest";
import {
  formatDeviceMetadataSubtitle,
  getDeviceDisplayInfo,
} from "@/lib/device-display-info";

describe("device display info", () => {
  it("builds default device names from user agent", () => {
    const desktop = getDeviceDisplayInfo(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    expect(desktop.defaultDeviceName).toContain("Chrome");
    expect(desktop.defaultDeviceName).toContain("macOS");

    const mobile = getDeviceDisplayInfo(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    expect(mobile.defaultDeviceName).toContain("(mobile)");
  });

  it("formats metadata subtitles and handles empty metadata", () => {
    expect(
      formatDeviceMetadataSubtitle({
        browser: "Chrome",
        platform: "macOS",
        deviceType: "desktop",
      })
    ).toContain("Chrome");
    expect(formatDeviceMetadataSubtitle({})).toBe("Unknown device");
    expect(formatDeviceMetadataSubtitle({ browser: "Chrome", deviceType: "unknown" })).toBe(
      "Chrome"
    );
  });
});
