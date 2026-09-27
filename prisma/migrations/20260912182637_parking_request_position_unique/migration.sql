-- ParkingRequest: (workoutId, position) 조합을 non-unique 인덱스에서 unique 제약으로 전환
-- 동시 신청 시 position 계산(max+1)이 Read Committed 하에서 직렬화되지 않아
-- 두 요청이 같은 position으로 삽입될 수 있었다. unique 제약으로 DB 레벨에서 막는다.
DROP INDEX "ParkingRequest_workoutId_position_idx";

CREATE UNIQUE INDEX "ParkingRequest_workoutId_position_key" ON "ParkingRequest"("workoutId", "position");
