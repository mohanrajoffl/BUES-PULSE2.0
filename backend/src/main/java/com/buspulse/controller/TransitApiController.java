package com.buspulse.controller;

import com.buspulse.dto.TransitDtos.EtaResult;
import com.buspulse.dto.TransitDtos.TrackingUpdateRequest;
import com.buspulse.model.BusEntity;
import com.buspulse.repository.TransitRepositories;
import com.buspulse.service.EtaAndTrackingService;
import jakarta.validation.Valid;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TransitApiController {

  private final TransitRepositories busRepository;
  private final EtaAndTrackingService etaService;
  private final SimpMessagingTemplate messagingTemplate;

  public TransitApiController(
    TransitRepositories busRepository,
    EtaAndTrackingService etaService,
    SimpMessagingTemplate messagingTemplate
  ) {
    this.busRepository = busRepository;
    this.etaService = etaService;
    this.messagingTemplate = messagingTemplate;
  }

  @GetMapping("/buses")
  public List<BusEntity> listBuses() {
    return busRepository.findAll();
  }

  @GetMapping("/eta/{busId}")
  public EtaResult getEta(
    @PathVariable String busId,
    @RequestParam(defaultValue = "11.4772") double lat,
    @RequestParam(defaultValue = "77.8742") double lon
  ) {
    return etaService.computeEstimatedEta(busId, lat, lon, 11.4457, 77.6822, 44.0, true);
  }

  @PostMapping("/tracking/update")
  @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
  public TrackingUpdateRequest pushTrackingUpdate(@Valid @RequestBody TrackingUpdateRequest payload) {
    messagingTemplate.convertAndSend("/topic/bus-locations", payload);
    return payload;
  }
}
