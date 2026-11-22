package com.buspulse.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "buses")
public class BusEntity {
  @Id
  @Column(name = "bus_id", length = 64)
  private String busId;

  @Column(name = "bus_number", nullable = false, unique = true, length = 32)
  private String busNumber;

  @Column(name = "bus_operator", nullable = false, length = 120)
  private String busOperator;

  @Column(name = "bus_type", nullable = false, length = 40)
  private String busType;

  @Column(name = "route_id", nullable = false, length = 64)
  private String routeId;

  @Column(nullable = false, precision = 8, scale = 2)
  private BigDecimal fare;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "is_simulated", nullable = false)
  private boolean simulated = true;

  @Column(name = "data_mode", nullable = false, length = 16)
  private String dataMode = "DEMO";

  public String getBusId() { return busId; }
  public String getBusNumber() { return busNumber; }
  public String getBusOperator() { return busOperator; }
  public String getBusType() { return busType; }
  public String getRouteId() { return routeId; }
  public BigDecimal getFare() { return fare; }
  public String getStatus() { return status; }
  public boolean isSimulated() { return simulated; }
  public String getDataMode() { return dataMode; }
}

@Entity
@Table(name = "live_locations")
class LiveLocationEntity {
  @Id
  @Column(name = "location_id", length = 64)
  private String locationId;

  @Column(name = "bus_id", nullable = false, length = 64)
  private String busId;

  @Column(nullable = false, precision = 9, scale = 6)
  private BigDecimal latitude;

  @Column(nullable = false, precision = 9, scale = 6)
  private BigDecimal longitude;

  @Column(name = "speed_kmh", nullable = false, precision = 5, scale = 2)
  private BigDecimal speedKmh;

  @Column(name = "is_simulated", nullable = false)
  private boolean simulated = true;

  @Column(name = "recorded_at", nullable = false)
  private Instant recordedAt = Instant.now();

  public String getBusId() { return busId; }
  public BigDecimal getLatitude() { return latitude; }
  public BigDecimal getLongitude() { return longitude; }
  public BigDecimal getSpeedKmh() { return speedKmh; }
  public boolean isSimulated() { return simulated; }
  public Instant getRecordedAt() { return recordedAt; }
}
