package com.buspulse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TransitDtos {
  public record TrackingUpdateRequest(
    @NotBlank String busId,
    @NotNull Double latitude,
    @NotNull Double longitude,
    @NotNull Double speedKmh,
    boolean simulated
  ) {}

  public record EtaResult(
    String busId,
    double distanceKm,
    double averageSpeedKmh,
    long estimatedEtaMinutes,
    String label,
    String predictionEngine,
    String dataMode,
    boolean simulated
  ) {}
}
