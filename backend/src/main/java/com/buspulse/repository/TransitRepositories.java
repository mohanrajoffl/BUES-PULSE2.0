package com.buspulse.repository;

import com.buspulse.model.BusEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TransitRepositories extends JpaRepository<BusEntity, String> {
  Optional<BusEntity> findByBusNumber(String busNumber);
}
