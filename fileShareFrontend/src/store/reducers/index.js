import { combineReducers } from 'redux'
import fileReducer from './fileReducer'
import userReducer from './userReducer'

const rootReducer = combineReducers({
  file: fileReducer,
  auth: userReducer,
})

export default rootReducer
