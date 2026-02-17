import React from 'react'

const InputSelect = ({ label, value, setValue, options, disabled }) => {
  return (
    <div className='mb-3'>
      <label className='form-label'>
        {label}
      </label>

      <select
        className='form-select mb-3'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      >
        {options?.map((op, i) => (
          <option value={op} key={i + 1}>
            {op}
          </option>
        ))}
      </select>
    </div>
  )
}

export default InputSelect
