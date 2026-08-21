import React from 'react'
import HeartFlipbook from "../components/Static/HeartFlipbook/HeartFlipbook";
import Facility from '../components/Static/Facility/Facility'
import ShortIntro from '../components/Static/ShortIntro/ShortIntro'
import WhyChoose from '../components/Static/WhyChoose/WhyChoose'
import ContactMessage from '../components/Static/ContactMessage/ContactMessage'
import PatentReviews from '../components/Static/PatentReviews/PatentReviews'

const Home = () => {
  return (
  <>
  <HeartFlipbook/>
  <Facility/>
  <ShortIntro/>
  <WhyChoose/>
  <PatentReviews/>
  <ContactMessage/>
  </>
  )
}
export default Home
