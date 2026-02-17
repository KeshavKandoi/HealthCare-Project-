import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

// images
import Banner1 from "../../assets/images/Banner1.png";
import Banner2 from "../../assets/images/Banner2.png";
import Banner3 from "../../assets/images/Banner3.png";

const Slider = () => {
  const images = [Banner1, Banner2, Banner3];  

  return (
    <Swiper
      modules={[Autoplay]}
      spaceBetween={10}
      slidesPerView={1}
      loop={true}
      autoplay={{delay:3000,disableOnInteraction:false}}
    >
      {images.map((img, index ) => (
        <SwiperSlide key={index}>
         <img
  src={img}
  alt="banner"
  style={{
    width: "100%",
    height: "750px",
    objectFit: "cover"
  }}
/>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default Slider;
