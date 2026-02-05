import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';

import { useJoinModalContext } from '../../JoinModalContext';

function TournamentFields() {
  const { formData, onChangeInput, tournamentLevelOptions } =
    useJoinModalContext();

  return (
    <>
      <FormField label="구대회 신청 가능 급수" required>
        <Select
          name="localTournamentLevel"
          value={formData.localTournamentLevel}
          onChange={onChangeInput}
          options={tournamentLevelOptions}
          required
        />
      </FormField>

      <FormField label="전국대회 신청 가능 급수" required>
        <Select
          name="nationalTournamentLevel"
          value={formData.nationalTournamentLevel}
          onChange={onChangeInput}
          options={tournamentLevelOptions}
          required
        />
      </FormField>

      <FormField label="레슨 받은 기간" required>
        <Input
          type="text"
          name="lessonPeriod"
          value={formData.lessonPeriod}
          onChange={onChangeInput}
          placeholder="예: 6개월"
          required
        />
      </FormField>

      <FormField label="구력" required>
        <Input
          type="text"
          name="playingPeriod"
          value={formData.playingPeriod}
          onChange={onChangeInput}
          placeholder="예: 2년"
          required
        />
      </FormField>
    </>
  );
}

export default TournamentFields;
