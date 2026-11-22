package com.buspulse.service;

import com.buspulse.dto.TransitDtos.EtaResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EtaAndTrackingService {

  @Value("${buspulse.data-mode:DEMO}")
  private String dataMode;

  public EtaResult computeEstimatedEta(
    String busId,
    double busLat,
    double busLon,
    double stopLat,
    double stopLon,
    double speedKmh,
    boolean simulated
  ) {
    double distKm = haversineKm(busLat, busLon, stopLat, stopLon);
    double safeSpeed = Math.max(22.0, speedKmh);
    long etaMin = Math.max(1L, Math.round((distKm / safeSpeed) * 60.0));
    return new EtaResult(
      busId,
      Math.round(distKm * 10.0) / 10.0,
      safeSpeed,
      etaMin,
      "Estimated ETA",
      "DISTANCE_SPEED_PROTOTYPE",
      dataMode,
      simulated
    );
  }

  private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
    final double r = 6371.0;
    double dLat = Math.toRadians(lat2 - lat1);
    double dLon = Math.toRadians(lon2 - lon1);
    double a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
      * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
